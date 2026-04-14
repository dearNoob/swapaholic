const { HfInference } = require("@huggingface/inference");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const logger = require('../utils/logger');
const storageService = require('../services/storageService');

// Initialize AI clients
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const DEFAULT_GEMINI_MODEL_LIST = ['gemini-flash-latest', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
const HF_MODEL = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2-VL-2B-Instruct';
const MIN_DESCRIPTION_WORDS = 80;
const MIN_PRODUCT_IMAGE_COUNT = Number(process.env.MIN_PRODUCT_IMAGE_COUNT || 4);
const GEMINI_RETRY_ATTEMPTS = Number(process.env.GEMINI_RETRY_ATTEMPTS || 3);
const HF_RETRY_ATTEMPTS = Number(process.env.HF_RETRY_ATTEMPTS || 2);
const DEFAULT_RETRY_DELAY_MS = Number(process.env.AI_RETRY_DELAY_MS || 700);
const WIKI_SEARCH_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const WIKI_SUMMARY_ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const GEMINI_REST_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const HTTP_TIMEOUT_MS = Number(process.env.AI_HTTP_TIMEOUT_MS || 6000);
const GEMINI_RESEARCH_TIMEOUT_MS = Number(process.env.AI_RESEARCH_TIMEOUT_MS || 12000);
const OUTBOUND_HEADERS = {
  'User-Agent': 'SwapaholicAI/1.0 (+https://swapaholic.local)',
  'Accept': 'application/json'
};
const CONDITION_MAP = Object.freeze({
  new: 'brand_new',
  'like-new': 'like_new',
  excellent: 'excellent',
  good: 'good',
  fair: 'fair',
  brand_new: 'brand_new',
  like_new: 'like_new'
});

const parseModelList = (...sources) => {
  const resolvedSource = sources.find((value) => value && String(value).trim());
  const rawModels = Array.isArray(resolvedSource)
    ? resolvedSource
    : String(resolvedSource || '')
      .split(',');

  const models = rawModels
    .map((modelName) => String(modelName).trim())
    .filter(Boolean);

  return models.length > 0 ? models : [...DEFAULT_GEMINI_MODEL_LIST];
};

const GEMINI_MODELS = parseModelList(process.env.GEMINI_MODELS, process.env.GEMINI_MODEL, DEFAULT_GEMINI_MODEL_LIST);

const getGeminiModel = (modelName) => genAI.getGenerativeModel({
  model: modelName,
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: 1800
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriableProviderError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('503') ||
    message.includes('429') ||
    message.includes('high demand') ||
    message.includes('service unavailable') ||
    message.includes('temporarily unavailable') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('socket hang up') ||
    message.includes('econnreset') ||
    message.includes('http error') ||
    message.includes('provider')
  );
};

const withRetry = async (operation, { attempts, label }) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetriableProviderError(error)) {
        throw error;
      }

      const delay = DEFAULT_RETRY_DELAY_MS * attempt;
      logger.warn(`${label} failed (attempt ${attempt}/${attempts}). Retrying in ${delay}ms. Error: ${error.message}`);
      await sleep(delay);
    }
  }
  throw lastError;
};

const compactValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeConditionValue = (condition = '') =>
  CONDITION_MAP[compactValue(condition).toLowerCase()] || condition;

const parseJsonField = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const validateMinimumImages = (images, contextLabel = 'product') => {
  const count = Array.isArray(images) ? images.length : 0;
  if (count >= MIN_PRODUCT_IMAGE_COUNT) {
    return null;
  }

  return {
    count,
    minRequired: MIN_PRODUCT_IMAGE_COUNT,
    message: `Validation failed: A ${contextLabel} must have at least ${MIN_PRODUCT_IMAGE_COUNT} images.`
  };
};

const sendErrorResponse = (res, statusCode, message, extra = {}) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...extra
  });

const sendServerErrorResponse = (res, context, error, statusCode = 500, message = 'Server error') => {
  logger.error(`${context}:`, error);
  const extra = process.env.NODE_ENV !== 'production' && error?.message
    ? { error: error.message }
    : {};

  return sendErrorResponse(res, statusCode, message, extra);
};

const escapeRegex = (value = '') =>
  compactValue(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const queueNewProductNotifications = ({ title, category, productId, sellerId }) => {
  setImmediate(async () => {
    try {
      const User = require('../models/User');
      const notificationService = require('../utils/notificationService');
      const titleWords = compactValue(title)
        .split(/\s+/)
        .filter((word) => word.length > 2)
        .map((word) => new RegExp(escapeRegex(word), 'i'));
      const categoryRegex = compactValue(category) ? new RegExp(escapeRegex(category), 'i') : null;
      const matchCondition = {
        $or: [
          ...(categoryRegex ? [{ interests: { $regex: categoryRegex } }] : []),
          ...titleWords.map((word) => ({ interests: { $regex: word } }))
        ],
        _id: { $ne: sellerId }
      };

      if (matchCondition.$or.length === 0) {
        return;
      }

      const interestedUsers = await User.find(matchCondition).select('_id');
      const userIds = interestedUsers.map((user) => user._id.toString());
      if (userIds.length > 0) {
        await notificationService.notifyNewProductMatch(userIds, title, productId, category);
      }
    } catch (notifError) {
      logger.error('Error sending notifications:', notifError);
    }
  });
};

const titleCaseLabel = (value = '') =>
  compactValue(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const humanizeCondition = (condition = '') => {
  const normalized = compactValue(condition).toLowerCase();
  const labelMap = {
    new: 'New',
    brand_new: 'Brand New',
    'brand-new': 'Brand New',
    like_new: 'Like New',
    'like-new': 'Like New',
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair'
  };

  return labelMap[normalized] || titleCaseLabel(normalized) || 'Used';
};

const formatBdtValue = (value = '') => {
  const raw = compactValue(value);
  if (!raw) return '';

  const numericValue = Number(raw);
  if (Number.isFinite(numericValue)) {
    return `BDT ${numericValue.toLocaleString('en-BD')}`;
  }

  return raw;
};

const formatProductAge = (value = '') => {
  const raw = compactValue(value);
  if (!raw) return '';

  const numericValue = Number(raw);
  if (!Number.isFinite(numericValue)) {
    return raw;
  }

  if (numericValue === 0) {
    return 'Less than 1 year';
  }

  return `${numericValue} year${numericValue === 1 ? '' : 's'}`;
};

const extractGeminiTextResponse = (data = {}) =>
  (data?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => compactValue(part?.text))
    .filter(Boolean)
    .join('\n')
    .trim();

const extractGroundingSources = (data = {}) => {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();

  return chunks
    .map((chunk) => ({
      title: compactValue(chunk?.web?.title),
      uri: compactValue(chunk?.web?.uri)
    }))
    .filter((source) => source.uri)
    .filter((source) => {
      if (seen.has(source.uri)) return false;
      seen.add(source.uri);
      return true;
    })
    .slice(0, 5);
};

const sanitizeGeneratedDescription = (description = '') =>
  compactValue(description)
    .replace(/seller-provided details:\s*/gi, '')
    .replace(/possible model\/spec references from online data:\s*/gi, '')
    .replace(/\n-\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const extractOnlineSpecHighlights = (onlineSpecContext = '') => {
  const raw = compactValue(onlineSpecContext);
  if (!raw) return [];

  return raw
    .replace(/\nURL:[^\n]*/g, '')
    .replace(/Source \d+:\s*/g, '')
    .split(/[\.\!\?]\s+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length > 25)
    .filter((sentence) => !/ecosystem|android-based|portable|core functionality|accessible alternative|value proposition|dependable|versatile/i.test(sentence))
    .slice(0, 3)
    .map((sentence) => `${sentence.replace(/[.]+$/g, '')}.`);
};

const appendFieldDrivenDetails = (description, {
  title,
  category,
  condition,
  predictionCategory = '',
  brand = '',
  deviceModel = '',
  originalPrice = '',
  price = '',
  productAge = '',
  onlineSpecContext = ''
}) => {
  const baseDescription = sanitizeGeneratedDescription(description);
  if (!baseDescription) return baseDescription;

  const titleText = compactValue(title);
  const categoryText = compactValue(category);
  const conditionText = humanizeCondition(condition);
  const deviceCategoryText = compactValue(predictionCategory);
  const brandText = compactValue(brand);
  const modelText = compactValue(deviceModel);
  const originalPriceText = formatBdtValue(originalPrice);
  const startingPriceText = formatBdtValue(price);
  const ageText = formatProductAge(productAge);
  const specHighlights = extractOnlineSpecHighlights(onlineSpecContext);
  const normalizedDescription = baseDescription.toLowerCase();
  const sections = [baseDescription];

  const sellerContextSentence = [
    titleText || brandText || modelText
      ? `${titleText || [brandText, modelText].filter(Boolean).join(' ') || 'This item'} is listed in ${categoryText || 'its selected category'}`
      : '',
    conditionText ? `with the seller marking the condition as ${conditionText}` : '',
    deviceCategoryText ? `under the ${deviceCategoryText} device category` : '',
    startingPriceText ? `at a starting price of ${startingPriceText}` : '',
    originalPriceText ? `${startingPriceText ? 'while the original purchase price was' : 'with an original purchase price of'} ${originalPriceText}` : '',
    ageText ? `and an estimated usage age of ${ageText}` : ''
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+,/g, ',')
    .trim();

  if (sellerContextSentence) {
    const sellerMarkers = [titleText, brandText, modelText, startingPriceText]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
    const isSellerContextMissing = sellerMarkers.some((marker) => !normalizedDescription.includes(marker));
    if (isSellerContextMissing) {
      sections.push(`${sellerContextSentence}.`);
    }
  }

  if (specHighlights.length > 0) {
    const specLead = specHighlights[0].toLowerCase().slice(0, 24);
    if (specLead && !normalizedDescription.includes(specLead)) {
      sections.push(`Verified model-specific web references indicate ${specHighlights.join(' ')}`);
    }
  }

  return sections.join('\n\n').trim();
};

const fetchWikipediaSummary = async (query) => {
  const normalizedQuery = compactValue(query);
  if (!normalizedQuery) return null;

  try {
    const searchRes = await axios.get(WIKI_SEARCH_ENDPOINT, {
      params: {
        action: 'opensearch',
        search: normalizedQuery,
        limit: 1,
        namespace: 0,
        format: 'json'
      },
      timeout: HTTP_TIMEOUT_MS,
      headers: OUTBOUND_HEADERS
    });

    const pageTitle = searchRes?.data?.[1]?.[0];
    if (!pageTitle) return null;

    const summaryRes = await axios.get(`${WIKI_SUMMARY_ENDPOINT}/${encodeURIComponent(pageTitle)}`, {
      timeout: HTTP_TIMEOUT_MS,
      headers: OUTBOUND_HEADERS
    });

    const extract = compactValue(summaryRes?.data?.extract);
    if (!extract) return null;

    return {
      title: compactValue(summaryRes?.data?.title) || pageTitle,
      extract,
      url: compactValue(summaryRes?.data?.content_urls?.desktop?.page)
    };
  } catch (error) {
    logger.warn(`Wikipedia lookup failed for "${normalizedQuery}": ${error.message}`);
    return null;
  }
};

const fetchOnlineSpecContext = async ({ title, predictionCategory, brand, deviceModel }) => {
  if (!process.env.GEMINI_API_KEY) return null;

  const titleText = compactValue(title);
  const brandText = compactValue(brand);
  const modelText = compactValue(deviceModel);
  const categoryText = compactValue(predictionCategory);
  const lookupSubject = [brandText, modelText].filter(Boolean).join(' ').trim() || titleText;

  if (!lookupSubject) return null;

  const prompt = `Use Google Search grounding to verify whether these seller inputs match a specific consumer device model.
Seller inputs:
- Title: ${titleText || 'N/A'}
- Device category: ${categoryText || 'N/A'}
- Brand: ${brandText || 'N/A'}
- Model: ${modelText || 'N/A'}

Return ONLY valid JSON:
{
  "matched": true,
  "confidence": "high",
  "matchedName": "full device name or clearly identified product family",
  "summary": "One or two short factual sentences about the matched device or model family.",
  "specs": ["short spec fact", "short spec fact"],
  "notes": "short note if needed"
}

Rules:
- Set "matched" to false if the search results are ambiguous, mixed between different generations, or do not clearly confirm the same device or product family.
- If the brand and model clearly identify a product family but not a specific storage or connectivity variant, you may still set "matched" to true and include only facts that are common to that family.
- Only include factual specs when the matched device or family is clearly supported by search results.
- Do not include generic statements such as ecosystem membership, portability, general Android support, or marketing fluff.
- Keep "specs" to at most 4 short facts that matter to a resale buyer.
- Prefer official manufacturer pages and trusted review/specification sources.`;

  let lastError;
  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await withRetry(
        async () => axios.post(
          `${GEMINI_REST_ENDPOINT}/${modelName}:generateContent`,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            tools: [
              {
                google_search: {}
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 800
            }
          },
          {
            timeout: GEMINI_RESEARCH_TIMEOUT_MS,
            headers: {
              ...OUTBOUND_HEADERS,
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY
            }
          }
        ),
        { attempts: GEMINI_RETRY_ATTEMPTS, label: `Gemini grounded research (${modelName})` }
      );

      const responseText = extractGeminiTextResponse(response.data);
      const payload = extractJsonObject(responseText);
      const matched = payload?.matched === true || String(payload?.matched).toLowerCase() === 'true';
      const confidence = compactValue(payload?.confidence).toLowerCase();
      const summary = compactValue(payload?.summary);
      const matchedName = compactValue(payload?.matchedName);
      const specs = Array.isArray(payload?.specs)
        ? payload.specs.map((item) => compactValue(item)).filter(Boolean).slice(0, 4)
        : [];
      const notes = compactValue(payload?.notes);

      if (!matched || !['high', 'medium'].includes(confidence)) {
        logger.info(`Grounded spec lookup skipped specs for "${lookupSubject}" due to ambiguous model match.`);
        return null;
      }

      const references = extractGroundingSources(response.data);
      const text = [summary, ...specs, notes].filter(Boolean).join('\n');

      return {
        matched,
        confidence,
        matchedName,
        summary,
        specs,
        notes,
        references,
        text
      };
    } catch (error) {
      lastError = error;
      logger.warn(`Grounded spec lookup failed for ${modelName}: ${error.message}`);
    }
  }

  logger.warn(`Grounded spec lookup unavailable for "${lookupSubject}". Last error: ${lastError?.message || 'unknown'}`);
  return null;
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const extractBalancedJsonCandidates = (text = '') => {
  const input = String(text);
  const candidates = [];
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (startIndex === -1) {
      if (char === '{') {
        startIndex = index;
        depth = 1;
        inString = false;
        isEscaped = false;
      }
      continue;
    }

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        candidates.push(input.slice(startIndex, index + 1));
        startIndex = -1;
      }
    }
  }

  return candidates;
};

const extractJsonObject = (text = '') => {
  const cleaned = String(text)
    .replace(/```json|```/gi, '')
    .trim();

  const candidatePayloads = [
    cleaned,
    ...extractBalancedJsonCandidates(cleaned)
  ];

  for (const candidate of candidatePayloads) {
    const parsed = safeJsonParse(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  }

  const scoreMatch = cleaned.match(/(?:quality\s*score|score)\s*[:\-]?\s*(\d{1,3})/i);
  const priceMatch = cleaned.match(/(?:suggested\s*price|resale\s*price|price)\s*[:\-]?\s*(?:bdt|tk|taka|\$)?\s*(\d+(?:\.\d+)?)/i);
  const description = cleaned
    .replace(/^[^{\[]*?(?=(?:\{|\[|description\b))/is, '')
    .trim() || cleaned;

  return {
    description,
    score: scoreMatch ? Number(scoreMatch[1]) : undefined,
    price: priceMatch ? Number(priceMatch[1]) : undefined
  };
};

const getWordCount = (value = '') =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const normalizeAiPayload = (payload = {}) => {
  const description = String(payload.description || '').trim();
  const wordCount = getWordCount(description);

  if (!description || wordCount < MIN_DESCRIPTION_WORDS) {
    throw new Error(`AI description too short (${wordCount} words).`);
  }

  const score = Number(payload.score);
  const price = Number(payload.price);

  return {
    description,
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 85,
    price: Number.isFinite(price) ? Math.max(0, price) : 0
  };
};

const inferQualityScoreFromCondition = (condition = '') => {
  const normalized = String(condition).toLowerCase();
  const scoreMap = {
    brand_new: 95,
    like_new: 90,
    excellent: 85,
    good: 75,
    fair: 60
  };

  return scoreMap[normalized] || 70;
};

const buildLocalDescriptionFallback = ({
  title,
  category,
  condition,
  language,
  seedText = '',
  predictionCategory = '',
  brand = '',
  deviceModel = '',
  originalPrice = '',
  price = '',
  productAge = '',
  onlineSpecContext = ''
}) => {
  const headline = compactValue(title) || compactValue(deviceModel) || 'Pre-owned item';
  const categoryText = compactValue(category) || 'general category';
  const conditionText = humanizeCondition(condition);
  const seed = compactValue(seedText);
  const brandText = compactValue(brand);
  const modelText = compactValue(deviceModel);
  const deviceCategoryText = compactValue(predictionCategory);
  const originalPriceText = formatBdtValue(originalPrice);
  const startingPriceText = formatBdtValue(price);
  const ageText = formatProductAge(productAge);
  const specHighlights = extractOnlineSpecHighlights(onlineSpecContext);

  const identityText = [brandText, modelText].filter(Boolean).join(' ').trim() || headline;
  const detailSentences = [
    `${identityText} is listed in the ${categoryText} category and the seller marked the condition as ${conditionText}.`,
    deviceCategoryText ? `The seller also identified it under the ${deviceCategoryText} device category.` : '',
    startingPriceText
      ? `${identityText} is being offered at ${startingPriceText}${originalPriceText ? ` against an original purchase price of ${originalPriceText}` : ''}.`
      : originalPriceText
        ? `The seller reported an original purchase price of ${originalPriceText}.`
        : '',
    ageText ? `Reported usage age is around ${ageText}, so buyers can judge the asking price against expected wear and battery or hardware aging.` : '',
    specHighlights.length > 0
      ? `Verified model-specific web references point to details such as ${specHighlights.join(' ')}`
      : '',
    seed ? `Visible or seller-supplied notes: ${seed}` : '',
    'Buyers should still verify the exact cosmetic condition, included accessories, and working status from the photos before placing a bid or confirming the purchase.'
  ].filter(Boolean);

  const baseDescription = detailSentences.join(' ');

  return appendFieldDrivenDetails(baseDescription, {
    title,
    category,
    condition,
    predictionCategory,
    brand,
    deviceModel,
    originalPrice,
    price,
    productAge,
    onlineSpecContext
  });
};
const expandDescriptionFallback = async ({
  title,
  category,
  condition,
  language,
  seedText = '',
  predictionCategory = '',
  brand = '',
  deviceModel = '',
  originalPrice = '',
  price = '',
  productAge = '',
  onlineSpecContext = ''
}) => {
  const prompt = `Write a detailed product listing description in ${language} for Swapaholic.
Title: ${title}
Category: ${category}
Condition: ${condition}
Existing notes: ${seedText || 'N/A'}
Prediction device category: ${predictionCategory || 'N/A'}
Brand: ${brand || 'N/A'}
Model: ${deviceModel || 'N/A'}
Original Price (BDT): ${originalPrice || 'N/A'}
Starting Price (BDT): ${price || 'N/A'}
Product Age (years): ${productAge || 'N/A'}
Online reference hints:
${onlineSpecContext || 'No online reference data available.'}

Requirements:
1. Write between 90 and 170 words.
2. Write natural buyer-facing marketplace prose only. No headings, no labels, no bullet list, and no meta sections.
3. Use every available seller field naturally in the prose: title, category, condition, device category, brand, model, original price, starting price, and product age.
4. Only include technical specifications when the online reference hints clearly point to the exact model. If the hints are missing or ambiguous, do not invent or guess specs.
5. Avoid generic filler, broad ecosystem statements, or obvious claims that do not help a buyer.
6. Keep the tone specific, practical, and realistic for a second-hand marketplace.
7. Output only the description text.`;

  let lastError;
  for (const modelName of GEMINI_MODELS) {
    try {
      const expandedText = await withRetry(async () => {
        const result = await getGeminiModel(modelName).generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        if (getWordCount(text) < MIN_DESCRIPTION_WORDS) {
          throw new Error(`Expanded text too short (${getWordCount(text)} words).`);
        }
        return text;
      }, { attempts: GEMINI_RETRY_ATTEMPTS, label: `Gemini description expansion (${modelName})` });

      return appendFieldDrivenDetails(expandedText, {
        title,
        category,
        condition,
        predictionCategory,
        brand,
        deviceModel,
        originalPrice,
        price,
        productAge,
        onlineSpecContext
      });
    } catch (error) {
      lastError = error;
      logger.warn(`Gemini expansion failed for ${modelName}: ${error.message}`);
    }
  }

  logger.warn(`AI expansion fallback exhausted. Using local template. Last error: ${lastError?.message || 'unknown'}`);
  return buildLocalDescriptionFallback({
    title,
    category,
    condition,
    language,
    seedText,
    predictionCategory,
    brand,
    deviceModel,
    originalPrice,
    price,
    productAge,
    onlineSpecContext
  });
};

const analyzeWithGemini = async ({ modelName, prompt, imageBase64, mimeType }) => {
  const result = await getGeminiModel(modelName).generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64,
        mimeType
      }
    }
  ]);

  const response = await result.response;
  return extractJsonObject(response.text());
};

const analyzeWithHuggingFace = async ({ prompt, imageBase64, mimeType }) => {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new Error('Hugging Face API key is missing.');
  }

  const result = await hf.chatCompletion({
    model: HF_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` }
          },
          {
            type: 'text',
            text: `${prompt}\n\nReturn ONLY valid JSON.`
          }
        ]
      }
    ],
    max_tokens: 1800,
    temperature: 0.4
  });

  const text = result?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from Hugging Face.');
  }

  return extractJsonObject(text);
};


// Analyze product images and generate description (Seller only)
const analyzeProduct = async (req, res) => {
  try {
    const {
      title,
      category,
      condition,
      language = 'English',
      predictionCategory,
      brand,
      deviceModel,
      originalPrice,
      price,
      productAge
    } = req.body;
    const primaryImage = Array.isArray(req.files) && req.files.length > 0 ? req.files[0] : null;
    const mappedCondition = normalizeConditionValue(condition);

    if (!primaryImage?.buffer) {
      return sendErrorResponse(res, 400, 'Please upload at least one image for AI analysis.');
    }

    const imageBase64 = primaryImage.buffer.toString('base64');

    const onlineSpec = await fetchOnlineSpecContext({
      title,
      predictionCategory,
      brand,
      deviceModel
    });
    const onlineSpecText = (onlineSpec?.text || '').slice(0, 2200);
    const exactModelMatchText = onlineSpec?.matchedName || 'Not confidently verified from grounded web results';

    const prompt = `Analyze this product image in detail and write a strong second-hand marketplace description for Swapaholic.
Product Context - Title: ${title}, Category: ${category}, Condition: ${mappedCondition}.
Seller Form Context:
- Prediction Device Category: ${predictionCategory || 'N/A'}
- Brand Name: ${brand || 'N/A'}
- Device/Model: ${deviceModel || 'N/A'}
- Original Price (BDT): ${originalPrice || 'N/A'}
- Starting Price (BDT): ${price || 'N/A'}
- Product Age (Years): ${productAge || 'N/A'}
Grounded Web Research:
- Verified model or family match: ${exactModelMatchText}
- Verified facts:
${onlineSpecText || 'No exact grounded web spec match was confirmed. Do not mention technical specs unless they are visually obvious in the image.'}

STRICT REQUIREMENTS:
1. DESCRIPTION LENGTH: Your generated description MUST be between 90 and 170 words.
2. STYLE: Write natural buyer-facing marketplace prose only. No headings, no labels, no bullet lists, and no mention of "seller-provided details" or "online research".
3. CONTENT:
   - Identify visible features, materials, textures, and likely brand indicators.
   - Mention visible wear/scratches/defects and align with the condition.
   - Use Seller Form Context fields explicitly and naturally in the description when available.
   - Mention Title, Category, Condition, Prediction Device Category, Brand Name, Device/Model, Original Price (BDT), Starting Price (BDT), and Product Age (Years) directly whenever those values are provided.
   - Only include technical specifications when Grounded Web Research clearly supports the same device or product family. If a reliable match is not confirmed, skip the specs.
   - Avoid generic marketplace filler or vague wording.
   - Do not add broad statements such as ecosystem membership, Android availability, portability, or "great for everyday tasks" unless the image and grounded facts truly justify them.
4. LANGUAGE: Generate the text entirely in ${language}.

TASKS:
- Provide a concise but specific description in the required format.
- Provide a quality score (0-100) based on visible condition.
- Suggest a fair resale price in BDT for the Bangladeshi second-hand market.

Return ONLY valid JSON in this format:
{
  "description": "[90-170 words of natural prose]",
  "score": 85,
  "price": 12000
}`;

    let payload;
    let provider = 'unknown';
    const providerErrors = [];

    for (const modelName of GEMINI_MODELS) {
      try {
        payload = await withRetry(
          async () => analyzeWithGemini({
            modelName,
            prompt,
            imageBase64,
            mimeType: primaryImage.mimetype
          }),
          { attempts: GEMINI_RETRY_ATTEMPTS, label: `Gemini image analysis (${modelName})` }
        );
        provider = `gemini:${modelName}`;
        break;
      } catch (geminiError) {
        providerErrors.push(`Gemini(${modelName}): ${geminiError.message}`);
        logger.warn(`Gemini analysis failed for ${modelName}: ${geminiError.message}`);
      }
    }

    if (!payload) {
      try {
        payload = await withRetry(
          async () => analyzeWithHuggingFace({
            prompt,
            imageBase64,
            mimeType: primaryImage.mimetype
          }),
          { attempts: HF_RETRY_ATTEMPTS, label: `Hugging Face image analysis (${HF_MODEL})` }
        );
        provider = `huggingface:${HF_MODEL}`;
      } catch (hfError) {
        providerErrors.push(`HuggingFace(${HF_MODEL}): ${hfError.message}`);
        logger.warn(`Hugging Face analysis failed for ${HF_MODEL}: ${hfError.message}`);
      }
    }

    if (!payload) {
      provider = 'local-fallback';
      payload = {
        description: buildLocalDescriptionFallback({
          title,
          category,
          condition: mappedCondition,
          language,
          predictionCategory,
          brand,
          deviceModel,
          originalPrice,
          price,
          productAge,
          onlineSpecContext: onlineSpecText
        }),
        score: inferQualityScoreFromCondition(mappedCondition),
        price: 0
      };
      logger.warn(`All AI providers failed, served local fallback. Details: ${providerErrors.join(' | ')}`);
    }

    let aiData;
    try {
      aiData = normalizeAiPayload(payload);
    } catch (normalizeError) {
      logger.warn(`AI payload normalization failed (${normalizeError.message}). Retrying with text-expansion fallback.`);
      const expandedDescription = await expandDescriptionFallback({
        title,
        category,
        condition: mappedCondition,
        language,
        seedText: String(payload?.description || ''),
        predictionCategory,
        brand,
        deviceModel,
        originalPrice,
        price,
        productAge,
        onlineSpecContext: onlineSpecText
      });

      aiData = normalizeAiPayload({
        description: expandedDescription,
        score: payload?.score,
        price: payload?.price
      });
    }

    aiData.description = appendFieldDrivenDetails(aiData.description, {
      title,
      category,
      condition: mappedCondition,
      predictionCategory,
      brand,
      deviceModel,
      originalPrice,
      price,
      productAge,
      onlineSpecContext: onlineSpecText
    });

    res.json({
      success: true,
      description: aiData.description,
      score: aiData.score,
      qualityScore: aiData.score,
      suggestedPrice: aiData.price,
      price: aiData.price,
      provider
    });
  } catch (error) {
    return sendServerErrorResponse(res, 'Analyze product error', error, 502, `AI analysis failed: ${error.message}`);
  }
};
// Regenerate description based on current details
const regenerateDescription = async (req, res) => {
  try {
    const { title, category, condition, description, language = 'English' } = req.body;
    
    
    const prompt = `Rewrite this product description in ${language} to be highly professional, persuasive, and detailed for an e-commerce marketplace. 
    Current Title: ${title}
    Category: ${category}
    Condition: ${condition}
    Current Description: ${description}
    
    STRICT REQUIREMENTS:
    1. EXPANSION: The new description MUST be between 150 and 300 words. Expand on the original details significantly.
    2. FORMATTING: Use a professional opening paragraph followed by an extensive bulleted list of features and benefits.
    3. TONE: Persuasive, professional, and descriptive.
    
    Provide ONLY the rewritten description text without any extra chat, labels, or JSON wrappers.`;

    let aiDescription = '';
    let provider = 'unknown';
    const providerErrors = [];

    for (const modelName of GEMINI_MODELS) {
      try {
        aiDescription = await withRetry(async () => {
          const result = await getGeminiModel(modelName).generateContent(prompt);
          const response = await result.response;
          const text = response.text().trim();
          if (getWordCount(text) < 40) {
            throw new Error(`Regenerated description too short (${getWordCount(text)} words).`);
          }
          return text;
        }, { attempts: GEMINI_RETRY_ATTEMPTS, label: `Gemini regenerate (${modelName})` });

        provider = `gemini:${modelName}`;
        break;
      } catch (error) {
        providerErrors.push(`Gemini(${modelName}): ${error.message}`);
      }
    }

    if (!aiDescription) {
      try {
        aiDescription = await withRetry(async () => {
          const result = await hf.chatCompletion({
            model: HF_MODEL,
            messages: [
              {
                role: 'user',
                content: `${prompt}\n\nReturn only the rewritten text.`
              }
            ],
            max_tokens: 1800,
            temperature: 0.4
          });
          const text = result?.choices?.[0]?.message?.content?.trim();
          if (getWordCount(text) < 40) {
            throw new Error(`HF regenerated description too short (${getWordCount(text)} words).`);
          }
          return text;
        }, { attempts: HF_RETRY_ATTEMPTS, label: `Hugging Face regenerate (${HF_MODEL})` });
        
        provider = `huggingface:${HF_MODEL}`;
      } catch (hfError) {
        providerErrors.push(`HuggingFace(${HF_MODEL}): ${hfError.message}`);
        logger.warn(`Hugging Face regenerate failed for ${HF_MODEL}: ${hfError.message}`);
      }
    }

    if (!aiDescription) {
      aiDescription = await expandDescriptionFallback({
        title,
        category,
        condition,
        language,
        seedText: description
      });
      provider = 'local-fallback';
      logger.warn(`Regenerate description used fallback. Details: ${providerErrors.join(' | ')}`);
    }

    res.json({
      success: true,
      description: aiDescription,
      provider
    });
  } catch (error) {
    return sendServerErrorResponse(res, 'Regenerate description error', error, 502, `Regenerate description failed: ${error.message}`);
  }
};


// Create product (seller only)
const createProduct = async (req, res) => {
  try {
    let { title, description, category, basePrice, price, condition, geometry, location, aiQualityScore, aiSuggestedPrice } = req.body;

    // Handle mismatched field name from frontend
    if (!basePrice && price) {
      basePrice = price;
    }

    // Parse basePrice as number (FormData sends strings)
    basePrice = parseFloat(basePrice);

    if (!title || !description || !category || !condition || !Number.isFinite(basePrice) || basePrice <= 0) {
      return sendErrorResponse(res, 400, 'Missing required fields', { 
        details: { 
          title: !!title, 
          description: !!description, 
          category: !!category, 
          basePrice: Number.isFinite(basePrice) && basePrice > 0, 
          condition: !!condition 
        } 
      });
    }
    const mappedCondition = normalizeConditionValue(condition);

    // Handle uploaded images through the configured storage provider
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await storageService.uploadFiles(req.files, {
        folder: 'products',
        resourceType: 'image'
      });
    }

    // Also handle pre-existing image URLs from body
    if (req.body.images) {
      const bodyImages = parseJsonField(req.body.images, req.body.images);
      if (Array.isArray(bodyImages)) {
        imageUrls = [...imageUrls, ...bodyImages];
      }
    }

    const imageValidation = validateMinimumImages(imageUrls, 'product listing');
    if (imageValidation) {
      return sendErrorResponse(res, 400, imageValidation.message, {
        details: {
          count: imageValidation.count,
          minRequired: imageValidation.minRequired
        }
      });
    }

    const parsedGeometry = parseJsonField(geometry, null);

    const product = new Product({
      sellerId: req.user.id,
      title,
      description,
      category,
      basePrice,
      condition: mappedCondition,
      geometry: parsedGeometry || { type: 'Point', coordinates: [0, 0] },
      location,
      images: imageUrls,
      status: 'active',
      bidStartDate: new Date(),
      aiQualityScore: parseFloat(aiQualityScore) || 0,
      aiSuggestedPrice: aiSuggestedPrice ? parseFloat(aiSuggestedPrice) : undefined
    });

    await product.save();
    res.status(201).json(product);
    queueNewProductNotifications({
      title,
      category,
      productId: product._id,
      sellerId: req.user.id
    });

  } catch (error) {
    return sendServerErrorResponse(res, 'Create product error', error, 500, 'Failed to create product');
  }
};

// Get all products with advanced filters and pagination
const getProducts = async (req, res) => {
  try {
    const {
      category,
      condition,
      status: reqStatus,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      minPrice,
      maxPrice,
      search,
      lat,
      lng,
      radius
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Default status: show active and bidden products
    let statusFilter;
    if (reqStatus && reqStatus !== 'all') {
      statusFilter = reqStatus;
    } else {
      statusFilter = { $in: ['active', 'bidden'] };
    }

    // Base match stage
    const matchStage = { status: statusFilter };
    
    // Case-insensitive category match
    if (category && category !== 'all') {
      matchStage.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    
    if (condition) matchStage.condition = condition;
    
    if (minPrice || maxPrice) {
      matchStage.basePrice = {};
      if (minPrice) matchStage.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) matchStage.basePrice.$lte = parseFloat(maxPrice);
    }

    let pipeline = [];
    let countMatchStage = { ...matchStage };

    // Case 1: Geospatial search
    if (lat && lng && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusMeters = parseFloat(radius) * 1000;

      pipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: radiusMeters,
          spherical: true,
          query: matchStage
        }
      });
      countMatchStage = null; 
    } else if (search) {
      // Case 2: Text search
      pipeline.push({ $match: { ...matchStage, $text: { $search: search } } });
      pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
      countMatchStage = { ...matchStage, $text: { $search: search } };
    } else {
      // Case 3: Standard match
      pipeline.push({ $match: matchStage });
    }

    // Sorting
    const sortStage = {};
    if (search && !lat) {
      sortStage.score = -1;
    }
    
    if (sortBy === 'price_asc' || sortBy === 'price-low') {
      sortStage.basePrice = 1;
    } else if (sortBy === 'price_desc' || sortBy === 'price-high') {
      sortStage.basePrice = -1;
    } else if (sortBy === 'newest') {
      sortStage.createdAt = -1;
    } else if (sortBy === 'ending-soon') {
      sortStage.bidEndDate = 1;
    } else if (sortBy === 'most-bids') {
      sortStage.highestBidAmount = -1;
    } else if (!sortStage.score) {
      sortStage.createdAt = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Lookups
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller'
      }
    });
    pipeline.push({ $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } });

    // Lookup bidCount
    pipeline.push({
      $lookup: {
        from: 'bids',
        let: { pId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$productId', '$$pId'] }, { $eq: ['$status', 'active'] } ] } } },
          { $count: 'count' }
        ],
        as: 'bidCountObj'
      }
    });
    pipeline.push({
      $addFields: {
        bidCount: { $ifNull: [ { $arrayElemAt: ['$bidCountObj.count', 0] }, 0 ] }
      }
    });

    pipeline.push({
      $addFields: {
        'sellerId': {
          _id: '$seller._id',
          firstName: '$seller.firstName',
          lastName: '$seller.lastName',
          ratingAverage: '$seller.ratingAverage'
        }
      }
    });
    pipeline.push({ $project: { seller: 0 } });

    const products = await Product.aggregate(pipeline);

    // Count
    let total = 0;
    if (lat && lng && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusMeters = parseFloat(radius) * 1000;
      const countResult = await Product.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [longitude, latitude] },
            distanceField: 'distance',
            maxDistance: radiusMeters,
            spherical: true,
            query: matchStage
          }
        },
        { $count: 'total' }
      ]);
      total = countResult[0]?.total || 0;
    } else {
      total = await Product.countDocuments(countMatchStage);
    }

    const mappedProducts = products.map(p => ({
      ...p,
      id: p._id,
      price: p.basePrice || 0,
      currentBid: p.highestBidAmount || p.basePrice || 0,
      auctionEndTime: p.bidEndDate,
      images: p.images || [],
      bidCount: p.bidCount || 0,
      seller: p.sellerId
    }));

    res.json({
      success: true,
      data: {
        data: mappedProducts,
        total,
        pagination: { 
          page: pageNum, 
          limit: limitNum, 
          total, 
          totalPages: Math.ceil(total / limitNum) 
        },
        filters: { category, condition, minPrice, maxPrice, search, sortBy }
      }
    });
  } catch (error) {
    return sendServerErrorResponse(res, 'Get products error', error);
  }
};

// Get product by ID with view tracking
const getProductById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendErrorResponse(res, 400, 'Invalid product ID format');
    }

    let product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('sellerId', 'firstName lastName ratingAverage createdAt totalTransactions profilePicture');

    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    let bidCount = 0;
    const lifecycleUpdateOps = { $set: {}, $unset: {} };

    if (['active', 'bidden'].includes(product.status) && product.bidEndDate && new Date() > product.bidEndDate) {
      const Bid = require('../models/Bid');
      bidCount = await Bid.countDocuments({ productId: product._id, status: 'active' });

      if (bidCount > 0) {
        lifecycleUpdateOps.$set.status = 'auction_ended';
        lifecycleUpdateOps.$set.auctionEndedAt = new Date();
      } else {
        lifecycleUpdateOps.$set.status = 'active';
        lifecycleUpdateOps.$set.auctionEndedAt = new Date();
        lifecycleUpdateOps.$unset.bidEndDate = 1;
      }
    }

    const hasLifecycleUpdates =
      Object.keys(lifecycleUpdateOps.$set).length > 0 || Object.keys(lifecycleUpdateOps.$unset).length > 0;

    if (hasLifecycleUpdates) {
      const updateDocument = {};
      if (Object.keys(lifecycleUpdateOps.$set).length > 0) {
        updateDocument.$set = lifecycleUpdateOps.$set;
      }
      if (Object.keys(lifecycleUpdateOps.$unset).length > 0) {
        updateDocument.$unset = lifecycleUpdateOps.$unset;
      }

      product = await Product.findByIdAndUpdate(
        req.params.id,
        updateDocument,
        { new: true }
      ).populate('sellerId', 'firstName lastName ratingAverage createdAt totalTransactions profilePicture');
    }

    try {
      const notificationService = require('../utils/notificationService');
      notificationService.sendToUser(
        product.sellerId._id.toString(),
        'product:view',
        {
          productId: product._id,
          productTitle: product.title,
          viewCount: product.viewCount
        }
      );
    } catch (notifErr) {
      logger.error('Error sending view notification:', notifErr);
    }

    return res.json({
      status: 'success',
      data: {
        ...product.toObject(),
        bidCount
      }
    });
  } catch (error) {
    return sendServerErrorResponse(res, 'Get product by ID error', error);
  }
};

// Update product (seller only)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendErrorResponse(res, 404, 'Product not found');

    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    const updates = { ...req.body };

    if (updates.condition) {
      updates.condition = normalizeConditionValue(updates.condition);
    }

    let finalImages = product.images || [];

    if (req.body.remainingImages || req.body.existingImages) {
      const existingImgs = req.body.remainingImages || req.body.existingImages;
      const parsedImages = parseJsonField(existingImgs, finalImages);
      finalImages = Array.isArray(parsedImages) ? parsedImages : finalImages;
    }

    if (req.files && req.files.length > 0) {
      const newImageUrls = await storageService.uploadFiles(req.files, {
        folder: 'products'
      });
      finalImages = [...finalImages, ...newImageUrls];
    }

    const imageValidation = validateMinimumImages(finalImages, 'product');
    if (imageValidation) {
      return sendErrorResponse(res, 400, imageValidation.message, {
        details: {
          count: imageValidation.count,
          minRequired: imageValidation.minRequired
        }
      });
    }

    updates.images = finalImages;
    updates.updatedAt = new Date();

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    return res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return sendErrorResponse(res, 400, 'Update validation failed', {
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    return sendServerErrorResponse(res, 'Update product error', error);
  }
};

// Delete product (seller only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Attempting to delete product ${id} by user ${req.user.id}`);
    
    const product = await Product.findById(id);
    if (!product) {
      logger.warn(`Delete failed: Product ${id} not found.`);
      return sendErrorResponse(res, 404, 'Product not found');
    }

    // Ownership check
    if (product.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      logger.warn(`Unauthorized delete attempt on product ${id} by user ${req.user.id}`);
      return sendErrorResponse(res, 403, 'Access denied: You do not own this product');
    }

    // Prevent deletion if product is sold or has bidden status (optional security)
    if (product.status === 'sold') {
      logger.warn(`Delete blocked: Product ${id} is already sold.`);
      return sendErrorResponse(res, 400, 'Sold products cannot be deleted');
    }

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      logger.error(`Failed to delete product ${id} from database.`);
      return sendErrorResponse(res, 500, 'Failed to delete product');
    }

    logger.info(`Successfully deleted product ${id}`);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    return sendServerErrorResponse(res, 'Delete product error', error);
  }
};


// Search products by geolocation
const searchNearby = async (req, res) => {
  try {
    const { lng, lat, maxDistance = 50000 } = req.query;
    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    const distanceMeters = parseInt(maxDistance);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(distanceMeters)) {
      return sendErrorResponse(res, 400, 'Valid latitude, longitude, and maxDistance are required');
    }

    const products = await Product.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: distanceMeters,
          spherical: true,
          query: { status: { $in: ['active', 'bidden'] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          sellerId: {
            _id: '$seller._id',
            firstName: '$seller.firstName',
            lastName: '$seller.lastName',
            ratingAverage: '$seller.ratingAverage'
          }
        }
      },
      { $project: { seller: 0 } }
    ]);

    res.json(products);
  } catch (error) {
    return sendServerErrorResponse(res, 'Search nearby error', error);
  }
};

// Get search suggestions (autocomplete)
const getSearchSuggestions = async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q || q.length < 2) return res.json({ suggestions: [] });

    const categoryMatches = await Product.find({
      category: { $regex: q, $options: 'i' },
      status: { $in: ['active', 'bidden'] }
    })
      .distinct('category')
      .then(cats => cats.slice(0, 5));

    const titleMatches = await Product.find({
      title: { $regex: q, $options: 'i' },
      status: { $in: ['active', 'bidden'] }
    })
      .distinct('title')
      .then(titles => titles.slice(0, 5));

    res.json({
      suggestions: [
        ...categoryMatches.map(cat => ({ type: 'category', value: cat })),
        ...titleMatches.map(title => ({ type: 'title', value: title }))
      ]
    });
  } catch (error) {
    return sendServerErrorResponse(res, 'Search suggestions error', error);
  }
};

// Get filter metadata
const getFilterMetadata = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: { $in: ['active', 'bidden'] } });
    const conditions = ['brand_new', 'like_new', 'excellent', 'good', 'fair'];
    const priceStats = await Product.aggregate([
      { $match: { status: { $in: ['active', 'bidden'] } } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$basePrice' },
          maxPrice: { $max: '$basePrice' },
          avgPrice: { $avg: '$basePrice' }
        }
      }
    ]);
    const priceRange = priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 };
    res.json({ categories, conditions, priceRange });
  } catch (error) {
    return sendServerErrorResponse(res, 'Get filter metadata error', error);
  }
};

// Get featured products
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.aggregate([
      { $match: { status: { $in: ['active', 'bidden'] } } },
      { $sample: { size: limit } },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          'sellerId': {
            _id: '$seller._id',
            firstName: '$seller.firstName',
            lastName: '$seller.lastName',
            ratingAverage: '$seller.ratingAverage'
          }
        }
      },
      { $project: { seller: 0 } }
    ]);
    res.json(products.map(p => ({
      ...p,
      id: p._id,
      currentBid: p.highestBidAmount || p.basePrice || 0,
      images: p.images || [],
      auctionEndTime: p.bidEndDate || new Date(Date.now() + 86400000).toISOString(),
      seller: p.sellerId
    })));
  } catch (error) {
    return sendServerErrorResponse(res, 'Get featured products error', error);
  }
};

// Admin actions
const approveProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }
    return res.json(product);
  } catch (error) {
    return sendServerErrorResponse(res, 'Approve product error', error);
  }
};

const rejectProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'qc_rejected' }, { new: true });
    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }
    return res.json(product);
  } catch (error) {
    return sendServerErrorResponse(res, 'Reject product error', error);
  }
};

const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return sendErrorResponse(res, 400, 'No files uploaded');
    const urls = await storageService.uploadFiles(req.files, { folder: 'products' });
    return res.json({ success: true, urls });
  } catch (error) {
    return sendServerErrorResponse(res, 'Upload images error', error);
  }
};

const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: products });
  } catch (error) {
    return sendServerErrorResponse(res, 'Get seller products error', error);
  }
};

const getSimilarProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendErrorResponse(res, 404, 'Product not found');
    const similar = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      status: { $in: ['active', 'bidden'] }
    })
    .limit(4)
    .populate('sellerId', 'firstName lastName ratingAverage');
    return res.json({ success: true, data: similar.map(p => ({ ...p.toObject(), id: p._id })) });
  } catch (error) {
    return sendServerErrorResponse(res, 'Get similar products error', error);
  }
};

const incrementViewCount = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }, { new: true });
    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }
    return res.json({ success: true, viewCount: product.viewCount });
  } catch (error) {
    return sendServerErrorResponse(res, 'Increment view count error', error);
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { status: { $in: ['active', 'bidden'] } });
    return res.json({ success: true, data: categories });
  } catch (error) {
    return sendServerErrorResponse(res, 'Get categories error', error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchNearby,
  getSearchSuggestions,
  getFilterMetadata,
  getFeaturedProducts,
  analyzeProduct,
  regenerateDescription,
  approveProduct,
  rejectProduct,
  uploadImages,
  getSellerProducts,
  getSimilarProducts,
  incrementViewCount,
  getCategories
};
