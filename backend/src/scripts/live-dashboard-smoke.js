require('dotenv').config();

const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../config/mongodb');
const User = require('../models/User');
const Product = require('../models/Product');
const Bid = require('../models/Bid');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const QCVerification = require('../models/QCVerification');
const Delivery = require('../models/Delivery');

const frontendSocketClientPath = path.resolve(
  __dirname,
  '../../../swapaholic-frontend/node_modules/socket.io-client'
);
const { io } = require(frontendSocketClientPath);

const backendRoot = path.resolve(__dirname, '../..');
const port = process.env.PORT || '5000';
const baseUrl = `http://127.0.0.1:${port}`;
const apiBaseUrl = `${baseUrl}/api`;
const smokePassword = 'Smoke1234';
const smokePrefix = `smoke_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const trackedIds = {
  users: [],
  products: [],
  bids: [],
  orders: [],
  payments: [],
  qc: [],
  deliveries: []
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate, options = {}) => {
  const timeoutMs = options.timeoutMs || 30000;
  const intervalMs = options.intervalMs || 400;
  const label = options.label || 'condition';
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await predicate();
    if (result) {
      return result;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${label}`);
};

const summarizePayload = (value) => {
  if (!value) return 'No payload';

  try {
    const json = JSON.stringify(value);
    return json.length > 500 ? `${json.slice(0, 500)}...` : json;
  } catch (error) {
    return String(value);
  }
};

const request = async (method, url, options = {}) => {
  const response = await axios({
    method,
    url: `${apiBaseUrl}${url}`,
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    data: options.data,
    params: options.params,
    timeout: options.timeoutMs || 20000,
    validateStatus: () => true
  });

  if (options.expectedStatus && response.status !== options.expectedStatus) {
    throw new Error(
      `${options.label || `${method.toUpperCase()} ${url}`} expected ${options.expectedStatus} but got ${response.status}. ` +
      `Payload: ${summarizePayload(response.data)}`
    );
  }

  return response;
};

const fetchHealth = async () => {
  try {
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: 1500,
      validateStatus: () => true
    });

    return response.status === 200;
  } catch (error) {
    return false;
  }
};

const startBackendIfNeeded = async () => {
  if (await fetchHealth()) {
    return { child: null, startedByScript: false, bufferedLogs: [] };
  }

  const bufferedLogs = [];
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: backendRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const pushLog = (prefix, chunk) => {
    const lines = String(chunk)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      bufferedLogs.push(`${prefix}${line}`);
      if (bufferedLogs.length > 50) {
        bufferedLogs.shift();
      }
    }
  };

  child.stdout.on('data', (chunk) => pushLog('[server] ', chunk));
  child.stderr.on('data', (chunk) => pushLog('[server:err] ', chunk));

  await waitFor(fetchHealth, {
    timeoutMs: 40000,
    intervalMs: 750,
    label: 'backend health endpoint'
  });

  return { child, startedByScript: true, bufferedLogs };
};

const stopSpawnedServer = async (child) => {
  if (!child || child.killed) {
    return;
  }

  child.kill('SIGTERM');

  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(5000)
  ]);

  if (!child.killed) {
    child.kill('SIGKILL');
  }
};

const trackId = (collection, value) => {
  if (!value) return;

  const id = typeof value === 'string'
    ? value
    : value._id
      ? value._id.toString()
      : value.toString();

  if (!trackedIds[collection].includes(id)) {
    trackedIds[collection].push(id);
  }
};

const getToken = (payload) => payload?.data?.accessToken || payload?.token;

const buildPhone = (index) => {
  const suffix = String(Date.now() + index).slice(-8);
  return `+88017${suffix}`;
};

const upsertUserAddress = async (userId, address) => {
  await User.findByIdAndUpdate(userId, {
    $set: {
      address: address.address,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode
    }
  });
};

const registerAndVerifyUser = async ({ role, label, address }) => {
  const email = `${label}_${smokePrefix}@example.com`.toLowerCase();
  const registration = await request('post', '/auth/register', {
    expectedStatus: 201,
    label: `${label} registration`,
    data: {
      firstName: label,
      lastName: 'Smoke',
      phone: buildPhone(Math.floor(Math.random() * 1000)),
      email,
      password: smokePassword,
      role,
      address: address.address
    }
  });

  if (!registration.data?.success) {
    throw new Error(`${label} registration did not return success`);
  }

  const user = await waitFor(
    () => User.findOne({ email }).select('+otp'),
    { timeoutMs: 10000, label: `${label} registration record` }
  );

  if (!user?.otp?.code) {
    throw new Error(`${label} registration OTP was not stored`);
  }

  trackId('users', user._id);

  const verification = await request('post', '/auth/verify-otp', {
    expectedStatus: 200,
    label: `${label} OTP verification`,
    data: {
      email,
      otp: user.otp.code,
      purpose: 'PHONE_VERIFY'
    }
  });

  const token = getToken(verification.data);
  const verifiedUser = verification.data?.data?.user || verification.data?.user;

  if (!token || !verifiedUser?.id) {
    throw new Error(`${label} OTP verification did not return a usable session`);
  }

  await upsertUserAddress(verifiedUser.id, address);

  return {
    email,
    password: smokePassword,
    token,
    id: verifiedUser.id
  };
};

const createAdminAndLogin = async () => {
  const email = `admin_${smokePrefix}@example.com`;
  const phone = buildPhone(9000);

  const user = await User.create({
    firstName: 'Admin',
    lastName: 'Smoke',
    email,
    password: smokePassword,
    phone,
    role: 'admin',
    emailVerified: true,
    phoneVerified: true
  });

  trackId('users', user._id);

  const response = await request('post', '/auth/admin/login', {
    expectedStatus: 200,
    label: 'admin login',
    data: {
      email,
      password: smokePassword
    }
  });

  const token = getToken(response.data);

  if (!token) {
    throw new Error('Admin login did not return an access token');
  }

  return {
    email,
    password: smokePassword,
    id: user._id.toString(),
    token
  };
};

const registerApproveAndLoginLogistics = async (adminToken) => {
  const email = `logistics_${smokePrefix}@example.com`;
  const registration = await request('post', '/logistics/register', {
    expectedStatus: 201,
    label: 'logistics registration',
    data: {
      firstName: 'Logistics',
      lastName: 'Smoke',
      phone: buildPhone(9500),
      email,
      password: smokePassword,
      address: 'Warehouse 12'
    }
  });

  const logisticsUserId = registration.data?.data?.user?.id;

  if (!logisticsUserId) {
    throw new Error('Logistics registration did not return a user id');
  }

  trackId('users', logisticsUserId);

  await request('put', `/admin/logistics-officers/${logisticsUserId}/approve`, {
    expectedStatus: 200,
    label: 'logistics approval',
    token: adminToken
  });

  await upsertUserAddress(logisticsUserId, {
    address: 'Warehouse 12',
    city: 'Dhaka',
    state: 'Dhaka',
    zipCode: '1205'
  });

  const login = await request('post', '/logistics/login', {
    expectedStatus: 200,
    label: 'logistics login',
    data: {
      email,
      password: smokePassword
    }
  });

  const token = getToken(login.data);

  if (!token) {
    throw new Error('Logistics login did not return an access token');
  }

  return {
    email,
    password: smokePassword,
    id: logisticsUserId,
    token
  };
};

const connectSocket = async (token) => {
  const events = {
    bid_received: [],
    order_created: [],
    payment_released: [],
    seller_payout: []
  };

  const socket = io(baseUrl, {
    auth: { token },
    transports: ['polling', 'websocket'],
    timeout: 10000,
    withCredentials: true
  });

  await Promise.race([
    new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    }),
    sleep(12000).then(() => {
      throw new Error('Timed out connecting seller socket');
    })
  ]);

  Object.keys(events).forEach((eventName) => {
    socket.on(eventName, (payload) => {
      events[eventName].push(payload);
    });
  });

  return { socket, events };
};

const createProduct = async (sellerToken, title, basePrice) => {
  const response = await request('post', '/products', {
    expectedStatus: 201,
    label: `create product ${title}`,
    token: sellerToken,
    data: {
      title,
      description: `${title} description`,
      category: 'electronics',
      basePrice,
      condition: 'excellent',
      images: [
        `${baseUrl}/uploads/smoke/${smokePrefix}-1.jpg`,
        `${baseUrl}/uploads/smoke/${smokePrefix}-2.jpg`,
        `${baseUrl}/uploads/smoke/${smokePrefix}-3.jpg`,
        `${baseUrl}/uploads/smoke/${smokePrefix}-4.jpg`
      ],
      geometry: {
        type: 'Point',
        coordinates: [90.4125, 23.8103]
      }
    }
  });

  trackId('products', response.data?._id);
  return response.data;
};

const placeBid = async (buyerToken, productId, bidAmount) => {
  const response = await request('post', '/bids', {
    expectedStatus: 201,
    label: `place bid ${bidAmount}`,
    token: buyerToken,
    data: {
      productId,
      bidAmount
    }
  });

  trackId('bids', response.data?.data?.id);
  return response.data.data;
};

const addToWishlist = async (buyerToken, productId) => {
  await request('post', '/wishlist', {
    expectedStatus: 201,
    label: 'add to wishlist',
    token: buyerToken,
    data: { productId }
  });
};

const getNotificationsByType = async (token, type) => {
  const response = await request('get', `/notifications/type/${type}`, {
    expectedStatus: 200,
    label: `notifications for ${type}`,
    token
  });

  return Array.isArray(response.data?.notifications) ? response.data.notifications : [];
};

const cleanupSmokeData = async () => {
  const userIds = trackedIds.users.map((id) => new mongoose.Types.ObjectId(id));
  const productIds = trackedIds.products.map((id) => new mongoose.Types.ObjectId(id));
  const orderIds = trackedIds.orders.map((id) => new mongoose.Types.ObjectId(id));

  await Notification.deleteMany({
    $or: [
      { recipientId: { $in: userIds } },
      { 'data.relatedId': { $in: [...trackedIds.orders, ...trackedIds.products, ...trackedIds.bids] } }
    ]
  }).catch(() => {});

  await Delivery.deleteMany({
    $or: [
      { _id: { $in: trackedIds.deliveries } },
      { orderId: { $in: orderIds } }
    ]
  }).catch(() => {});

  await QCVerification.deleteMany({
    $or: [
      { _id: { $in: trackedIds.qc } },
      { orderId: { $in: orderIds } }
    ]
  }).catch(() => {});

  await Payment.deleteMany({
    $or: [
      { _id: { $in: trackedIds.payments } },
      { orderId: { $in: orderIds } }
    ]
  }).catch(() => {});

  await Order.deleteMany({ _id: { $in: orderIds } }).catch(() => {});
  await Bid.deleteMany({ _id: { $in: trackedIds.bids } }).catch(() => {});
  await Product.deleteMany({ _id: { $in: productIds } }).catch(() => {});
  await User.deleteMany({ _id: { $in: userIds } }).catch(() => {});
};

const extractAmount = (socketPayload) =>
  socketPayload?.data?.amount ??
  socketPayload?.data?.data?.amount ??
  socketPayload?.amount ??
  null;

const main = async () => {
  let serverChild = null;
  let socket = null;
  let bufferedLogs = [];

  try {
    const serverState = await startBackendIfNeeded();
    serverChild = serverState.child;
    bufferedLogs = serverState.bufferedLogs;

    await connectDB();

    const seller = await registerAndVerifyUser({
      role: 'seller',
      label: 'SellerSmoke',
      address: {
        address: 'Seller Street 10',
        city: 'Dhaka',
        state: 'Dhaka',
        zipCode: '1207'
      }
    });

    const buyer = await registerAndVerifyUser({
      role: 'buyer',
      label: 'BuyerSmoke',
      address: {
        address: 'Buyer Avenue 22',
        city: 'Dhaka',
        state: 'Dhaka',
        zipCode: '1212'
      }
    });

    const admin = await createAdminAndLogin();
    const logistics = await registerApproveAndLoginLogistics(admin.token);

    const socketState = await connectSocket(seller.token);
    socket = socketState.socket;
    const sellerSocketEvents = socketState.events;

    const activeBidProduct = await createProduct(
      seller.token,
      `Active Bid Product ${smokePrefix}`,
      500
    );

    await addToWishlist(buyer.token, activeBidProduct._id);

    await placeBid(buyer.token, activeBidProduct._id, 550);

    await waitFor(
      () => sellerSocketEvents.bid_received.length >= 1,
      { timeoutMs: 12000, label: 'seller bid_received socket event' }
    );

    const orderFlowProduct = await createProduct(
      seller.token,
      `Order Flow Product ${smokePrefix}`,
      800
    );

    const acceptedBid = await placeBid(buyer.token, orderFlowProduct._id, 900);

    await waitFor(
      () => sellerSocketEvents.bid_received.length >= 2,
      { timeoutMs: 12000, label: 'second seller bid_received socket event' }
    );

    await request('post', `/bids/${acceptedBid.id}/accept`, {
      expectedStatus: 200,
      label: 'accept highest bid',
      token: seller.token
    });

    const confirmWin = await request('post', `/bids/${acceptedBid.id}/confirm-win`, {
      expectedStatus: 200,
      label: 'confirm auction win',
      token: buyer.token
    });

    const orderId = confirmWin.data?.data?.order?.id;
    trackId('orders', orderId);

    await waitFor(
      () => sellerSocketEvents.order_created.length >= 1,
      { timeoutMs: 12000, label: 'seller order_created socket event' }
    );

    const initiatePayment = await request('post', '/payments/initiate', {
      expectedStatus: 200,
      label: 'initiate mock payment',
      token: buyer.token,
      data: {
        orderId,
        method: 'bkash'
      }
    });

    const sessionKey = initiatePayment.data?.data?.sessionKey;

    if (!sessionKey) {
      throw new Error('Mock payment initiation did not return a session key');
    }

    const processMockPayment = await request('post', '/payments/mock/process', {
      expectedStatus: 200,
      label: 'process mock payment',
      data: {
        sessionKey,
        method: 'bkash',
        trxId: `TRX-${Date.now()}`,
        action: 'success'
      }
    });

    if (processMockPayment.data?.status !== 'success') {
      throw new Error('Mock payment did not complete successfully');
    }

    const paymentRecord = await waitFor(
      () => Payment.findOne({ orderId }),
      { timeoutMs: 10000, label: 'payment record' }
    );
    trackId('payments', paymentRecord._id);

    await request('post', '/qc/initiate', {
      expectedStatus: 201,
      label: 'seller QC initiation',
      token: seller.token,
      data: {
        orderId,
        inspectionNotes: 'Smoke QC request'
      }
    });

    const logisticsStatsBeforePickup = await request('get', '/logistics/dashboard/stats', {
      expectedStatus: 200,
      label: 'logistics stats before pickup',
      token: logistics.token
    });

    const logisticsTasksBeforePickup = await request('get', '/logistics/tasks', {
      expectedStatus: 200,
      label: 'logistics tasks before pickup',
      token: logistics.token,
      params: { limit: 20 }
    });

    await request('post', `/logistics/tasks/${orderId}/pickup`, {
      expectedStatus: 200,
      label: 'logistics pickup order',
      token: logistics.token
    });

    const qcRecord = await waitFor(
      () => QCVerification.findOne({ orderId }),
      { timeoutMs: 10000, label: 'QC record after pickup' }
    );
    trackId('qc', qcRecord._id);

    const deliveryRecord = await waitFor(
      () => Delivery.findOne({ orderId }),
      { timeoutMs: 10000, label: 'delivery record after pickup' }
    );
    trackId('deliveries', deliveryRecord._id);

    await request('put', `/logistics/qc/${qcRecord._id}/approve`, {
      expectedStatus: 200,
      label: 'logistics QC approval',
      token: logistics.token,
      data: {
        qualityValidation: 96,
        notes: 'Smoke QC passed'
      }
    });

    await request('put', `/orders/${orderId}`, {
      expectedStatus: 200,
      label: 'seller marks order in delivery',
      token: seller.token,
      data: {
        status: 'in_delivery'
      }
    });

    await request('put', `/logistics/delivery/${orderId}/status`, {
      expectedStatus: 200,
      label: 'delivery picked up',
      token: logistics.token,
      data: {
        status: 'picked_up'
      }
    });

    await request('put', `/logistics/delivery/${orderId}/status`, {
      expectedStatus: 200,
      label: 'delivery in transit',
      token: logistics.token,
      data: {
        status: 'in_transit'
      }
    });

    await request('put', `/logistics/delivery/${orderId}/status`, {
      expectedStatus: 200,
      label: 'delivery completed',
      token: logistics.token,
      data: {
        status: 'delivered'
      }
    });

    await request('post', `/payments/admin/release/${orderId}`, {
      expectedStatus: 200,
      label: 'admin release payment',
      token: admin.token
    });

    await waitFor(
      () => sellerSocketEvents.seller_payout.length >= 1 || sellerSocketEvents.payment_released.length >= 1,
      { timeoutMs: 12000, label: 'seller payout socket event' }
    );

    const buyerDashboard = await request('get', '/users/dashboard/buyer', {
      expectedStatus: 200,
      label: 'buyer dashboard endpoint',
      token: buyer.token
    });

    const buyerOrders = await request('get', '/orders', {
      expectedStatus: 200,
      label: 'buyer orders endpoint',
      token: buyer.token,
      params: { page: 1, limit: 10 }
    });

    const sellerDashboard = await request('get', '/seller/dashboard', {
      expectedStatus: 200,
      label: 'seller dashboard endpoint',
      token: seller.token
    });

    const sellerListings = await request('get', '/seller/listings', {
      expectedStatus: 200,
      label: 'seller listings endpoint',
      token: seller.token
    });

    const sellerRecentOrders = await request('get', '/seller/orders/recent', {
      expectedStatus: 200,
      label: 'seller recent orders endpoint',
      token: seller.token,
      params: { limit: 5 }
    });

    const sellerRecentBids = await request('get', '/seller/bids/recent', {
      expectedStatus: 200,
      label: 'seller recent bids endpoint',
      token: seller.token,
      params: { limit: 5 }
    });

    const sellerPerformance = await request('get', '/seller/performance', {
      expectedStatus: 200,
      label: 'seller performance endpoint',
      token: seller.token
    });

    const sellerEarnings = await request('get', '/seller/earnings', {
      expectedStatus: 200,
      label: 'seller earnings endpoint',
      token: seller.token
    });

    const sellerAnalytics = await request('get', '/seller/analytics', {
      expectedStatus: 200,
      label: 'seller analytics endpoint',
      token: seller.token,
      params: { period: '30d' }
    });

    const adminStats = await request('get', '/admin/dashboard/stats', {
      expectedStatus: 200,
      label: 'admin dashboard stats',
      token: admin.token
    });

    const adminAnalytics = await request('get', '/admin/analytics', {
      expectedStatus: 200,
      label: 'admin analytics',
      token: admin.token,
      params: { period: '30d' }
    });

    const adminHealth = await request('get', '/admin/dashboard/health', {
      expectedStatus: 200,
      label: 'admin health',
      token: admin.token
    });

    const adminTopPerformers = await request('get', '/admin/dashboard/top-performers', {
      expectedStatus: 200,
      label: 'admin top performers',
      token: admin.token
    });

    const logisticsStatsAfterFlow = await request('get', '/logistics/dashboard/stats', {
      expectedStatus: 200,
      label: 'logistics stats after flow',
      token: logistics.token
    });

    const logisticsActiveTasks = await request('get', '/logistics/tasks', {
      expectedStatus: 200,
      label: 'logistics active tasks after flow',
      token: logistics.token,
      params: { limit: 20 }
    });

    const logisticsHistory = await request('get', '/logistics/tasks/history', {
      expectedStatus: 200,
      label: 'logistics task history',
      token: logistics.token,
      params: { limit: 20 }
    });

    const sellerBidNotifications = await getNotificationsByType(seller.token, 'bid_received');
    const sellerOrderNotifications = await getNotificationsByType(seller.token, 'order_created');
    const sellerPayoutNotifications = await getNotificationsByType(seller.token, 'seller_payout');
    const buyerDeliveryNotifications = await getNotificationsByType(buyer.token, 'delivery_started');
    const buyerCompletedNotifications = await getNotificationsByType(buyer.token, 'delivery_completed');
    const buyerQcNotifications = await getNotificationsByType(buyer.token, 'qc_passed');

    const buyerStats = buyerDashboard.data?.data?.stats || {};
    const buyerOrdersTotal = buyerOrders.data?.data?.total || 0;
    const sellerRevenue = sellerDashboard.data?.revenue || {};
    const logisticsHistoryItems = logisticsHistory.data?.history || [];

    if (buyerStats.activeBids < 1) {
      throw new Error(`Expected at least 1 active buyer bid, received ${buyerStats.activeBids}`);
    }

    if (buyerStats.wonAuctions < 1) {
      throw new Error(`Expected at least 1 buyer won auction, received ${buyerStats.wonAuctions}`);
    }

    if (buyerStats.savedItems < 1) {
      throw new Error(`Expected at least 1 saved product, received ${buyerStats.savedItems}`);
    }

    if (buyerOrdersTotal < 1) {
      throw new Error(`Expected at least 1 buyer order, received ${buyerOrdersTotal}`);
    }

    if (!Array.isArray(sellerListings.data?.listings) || sellerListings.data.listings.length < 2) {
      throw new Error('Seller listings endpoint did not return both smoke products');
    }

    if (!Array.isArray(sellerRecentBids.data?.bids) || sellerRecentBids.data.bids.length < 1) {
      throw new Error('Seller recent bids endpoint returned no bids');
    }

    if (!Array.isArray(sellerRecentOrders.data?.orders) || sellerRecentOrders.data.orders.length < 1) {
      throw new Error('Seller recent orders endpoint returned no orders');
    }

    if ((adminStats.data?.users?.total || 0) < 4) {
      throw new Error('Admin dashboard stats did not include the smoke users');
    }

    if (!Array.isArray(adminAnalytics.data?.labels) || adminAnalytics.data.labels.length < 1) {
      throw new Error('Admin analytics endpoint returned no timeline data');
    }

    if (!Array.isArray(adminTopPerformers.data?.topSellers) || adminTopPerformers.data.topSellers.length < 1) {
      throw new Error('Admin top performers endpoint returned no top sellers');
    }

    if ((logisticsStatsBeforePickup.data?.qc?.pending || 0) < 1) {
      throw new Error('Logistics stats did not show pending QC before pickup');
    }

    if (!Array.isArray(logisticsTasksBeforePickup.data?.tasks) || logisticsTasksBeforePickup.data.tasks.length < 1) {
      throw new Error('Logistics tasks did not show the pending QC task before pickup');
    }

    if (!Array.isArray(logisticsHistoryItems) || logisticsHistoryItems.length < 2) {
      throw new Error('Logistics history did not capture both QC and delivery completions');
    }

    if (sellerBidNotifications.length < 1 || sellerOrderNotifications.length < 1) {
      throw new Error('Seller notification history is missing bid or order notifications');
    }

    if (sellerPayoutNotifications.length < 1) {
      throw new Error('Seller payout notification was not stored');
    }

    if (buyerDeliveryNotifications.length < 1 || buyerCompletedNotifications.length < 1 || buyerQcNotifications.length < 1) {
      throw new Error('Buyer notification history is missing QC or delivery notifications');
    }

    const payoutSocketAmount =
      extractAmount(sellerSocketEvents.payment_released[0]) ??
      extractAmount(sellerSocketEvents.seller_payout[0]);

    const summary = {
      server: {
        baseUrl,
        usedExistingServer: !serverChild
      },
      users: {
        seller: seller.email,
        buyer: buyer.email,
        admin: admin.email,
        logistics: logistics.email
      },
      sellerDashboard: {
        activeListings: sellerRevenue.activeListings,
        totalSales: sellerRevenue.totalSales,
        recentBids: sellerRecentBids.data?.bids?.length || 0,
        recentOrders: sellerRecentOrders.data?.orders?.length || 0,
        earningsMonth: sellerEarnings.data?.monthEarnings ?? sellerEarnings.data?.month ?? null,
        socketEvents: {
          bid_received: sellerSocketEvents.bid_received.length,
          order_created: sellerSocketEvents.order_created.length,
          payment_released: sellerSocketEvents.payment_released.length,
          seller_payout: sellerSocketEvents.seller_payout.length,
          payoutAmount: payoutSocketAmount
        }
      },
      buyerDashboard: {
        activeBids: buyerStats.activeBids,
        wonAuctions: buyerStats.wonAuctions,
        totalOrders: buyerStats.totalOrders,
        savedItems: buyerStats.savedItems
      },
      adminDashboard: {
        users: adminStats.data?.users?.total,
        products: adminStats.data?.products?.total,
        orders: adminStats.data?.orders?.total,
        totalRevenue: adminStats.data?.revenue?.total,
        health: adminHealth.data?.health
      },
      logisticsDashboard: {
        pendingQcBeforePickup: logisticsStatsBeforePickup.data?.qc?.pending,
        activeTasksAfterFlow: logisticsActiveTasks.data?.tasks?.length || 0,
        historyItems: logisticsHistoryItems.length,
        completedToday: logisticsStatsAfterFlow.data?.today?.totalCompleted
      },
      notifications: {
        sellerBidReceived: sellerBidNotifications.length,
        sellerOrderCreated: sellerOrderNotifications.length,
        sellerPayout: sellerPayoutNotifications.length,
        buyerQcPassed: buyerQcNotifications.length,
        buyerDeliveryStarted: buyerDeliveryNotifications.length,
        buyerDeliveryCompleted: buyerCompletedNotifications.length
      },
      notes: {
        payoutSocketEventName:
          sellerSocketEvents.payment_released.length > 0
            ? 'payment_released'
            : sellerSocketEvents.seller_payout.length > 0
              ? 'seller_payout'
              : 'none'
      }
    };

    console.log('LIVE_SMOKE_RESULT');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('LIVE_SMOKE_FAILED');
    console.error(error.stack || error.message);

    if (bufferedLogs.length > 0) {
      console.error('RECENT_SERVER_LOGS');
      bufferedLogs.forEach((line) => console.error(line));
    }

    process.exitCode = 1;
  } finally {
    if (socket) {
      socket.disconnect();
    }

    await cleanupSmokeData();
    await disconnectDB().catch(() => {});
    await stopSpawnedServer(serverChild).catch(() => {});
  }
};

void main();
