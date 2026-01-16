const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log('Checking available models for API Key...');

    if (!API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY is missing in .env');
        return;
    }

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);

        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response:', text);
            return;
        }

        const data = await response.json();

        if (!data.models) {
            console.log('⚠️ No models found in response:', data);
            return;
        }

        console.log('\n✅ Available Models:');
        data.models.forEach(model => {
            if (model.supportedGenerationMethods?.includes('generateContent')) {
                console.log(`- ${model.name.replace('models/', '')} (${model.displayName})`);
            }
        });

    } catch (error) {
        console.error('❌ Error listing models:', error.message);
    }
}

listModels();
