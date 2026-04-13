const cron = require('node-cron');
const Bid = require('../models/Bid');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const logger = require('./logger');
const notificationService = require('./notificationService');
const emailService = require('./emailService');

const FRONTEND_URL = process.env.FRONTEND_URL;
const CONFIRMATION_HOURS = 3;
const RATING_PENALTY = 0.5;
const PLATFORM_FEE = 30;
// Auto-release escrow 24 hours after buyer confirms delivery
const AUTO_RELEASE_DELAY_HOURS = 24;

/**
 * ═══════════════════════════════════════════════
 * JOB 1: Check Auction Expiry
 * Runs every minute. Finds products whose bidEndDate has passed,
 * picks the highest bidder, and sends confirmation email.
 * Timer starts AFTER email is sent (confirmationEmailSentAt).
 * ═══════════════════════════════════════════════
 */
async function checkAuctionExpiry() {
  try {
    // Find products with auction ended but not yet processed
    const expiredProducts = await Product.find({
      bidEndDate: { $lte: new Date() },
      status: { $in: ['active', 'bidden'] }
    });

    for (const product of expiredProducts) {
      try {
        // Find highest active bid
        const highestBid = await Bid.findOne({
          productId: product._id,
          status: 'active'
        }).sort({ bidAmount: -1 });

        if (!highestBid) {
          // No bids — re-list product
          product.status = 'active';
          product.bidEndDate = undefined;
          product.auctionEndedAt = new Date();
          await product.save();
          logger.info(`Auction ended with no bids for product ${product._id}, re-listed`);
          
          // Notify seller no bids
          try {
            await notificationService.notifyAuctionEndedNoBids(
              product._id,
              product.title,
              product.sellerId
            );
          } catch (notifErr) {
            logger.error('Error sending no-bids notification to seller:', notifErr);
          }
          continue;
        }

        // Mark product as auction_ended
        product.status = 'auction_ended';
        product.auctionEndedAt = new Date();
        await product.save();

        // Get buyer info for email
        const buyer = await User.findById(highestBid.buyerId);
        if (!buyer) {
          logger.error(`Winner user not found: ${highestBid.buyerId}`);
          continue;
        }

        // Mark bid as pending_confirmation
        const now = new Date();
        highestBid.status = 'pending_confirmation';
        highestBid.auctionWonAt = now;
        highestBid.confirmationEmailSentAt = now;
        highestBid.confirmationDeadline = new Date(now.getTime() + CONFIRMATION_HOURS * 60 * 60 * 1000);
        await highestBid.save();

        // Expire all other active bids (they haven't won yet, but keep 'active' ones for cascade)
        // We DON'T expire them — we need them for cascading to next bidder if winner doesn't confirm

        // Send confirmation email to winner
        const confirmLink = `${FRONTEND_URL}/my-bids/won`;
        await emailService.sendAuctionWonEmail(
          buyer.email,
          buyer.firstName,
          product.title,
          highestBid.bidAmount,
          confirmLink
        );

        // Send in-app notification
        try {
          await notificationService.notifyAuctionWon(
            highestBid._id,
            product._id,
            product.title,
            highestBid.bidAmount,
            buyer._id
          );
        } catch (notifErr) {
          logger.error('Error sending auction won notification:', notifErr);
        }

        // Send in-app notification to seller
        try {
          const bidderName = `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || 'A buyer';
          await notificationService.notifyAuctionEndedSeller(
            product._id,
            product.title,
            highestBid.bidAmount,
            bidderName,
            product.sellerId
          );
        } catch (notifErr) {
          logger.error('Error sending auction ended notification to seller:', notifErr);
        }

        logger.info(`Auction ended for product ${product._id}. Winner: ${buyer.email}, Amount: ৳${highestBid.bidAmount}`);
      } catch (productErr) {
        logger.error(`Error processing expired auction for product ${product._id}:`, productErr);
      }
    }
  } catch (err) {
    logger.error('checkAuctionExpiry error:', err);
  }
}

/**
 * ═══════════════════════════════════════════════
 * JOB 2: Check Confirmation Expiry
 * Runs every minute. Finds bids with expired confirmationDeadline,
 * penalizes the buyer, and cascades to the next highest bidder.
 * Cascades through ALL bidders (3rd, 4th, etc.) until one confirms
 * or no bidders remain.
 * ═══════════════════════════════════════════════
 */
async function checkConfirmationExpiry() {
  try {
    // Find bids that are pending_confirmation and deadline has passed
    const expiredBids = await Bid.find({
      status: 'pending_confirmation',
      confirmationDeadline: { $lte: new Date() }
    });

    for (const expiredBid of expiredBids) {
      try {
        const product = await Product.findById(expiredBid.productId);
        if (!product) continue;

        const buyer = await User.findById(expiredBid.buyerId);

        // 1. Mark bid as confirmation_expired
        expiredBid.status = 'confirmation_expired';
        await expiredBid.save();

        // 2. Penalize buyer rating (-0.5, minimum 0)
        if (buyer) {
          buyer.buyerRating = Math.max(0, (buyer.buyerRating || 5) - RATING_PENALTY);
          buyer.auctionNoConfirmCount = (buyer.auctionNoConfirmCount || 0) + 1;
          await buyer.save();

          // Send expiry notification & email
          try {
            await notificationService.notifyConfirmationExpired(product.title, buyer._id);
            await emailService.sendConfirmationExpiredEmail(buyer.email, buyer.firstName, product.title);
          } catch (e) {
            logger.error('Error sending expiry notifications:', e);
          }
        }

        // 3. Find next highest bidder (excluding expired/confirmation_expired bids)
        const nextBid = await Bid.findOne({
          productId: product._id,
          status: 'active',
          _id: { $ne: expiredBid._id }
        }).sort({ bidAmount: -1 });

        if (!nextBid) {
          // No more bidders — re-list product
          product.status = 'active';
          product.bidEndDate = undefined;
          product.highestBidAmount = undefined;
          product.highestBidderId = undefined;
          await product.save();
          logger.info(`No more bidders for product ${product._id}, re-listed`);
          continue;
        }

        // 4. Offer to next bidder
        const nextBuyer = await User.findById(nextBid.buyerId);
        if (!nextBuyer) {
          // Skip this bidder, mark as expired too
          nextBid.status = 'confirmation_expired';
          await nextBid.save();
          continue;
        }

        const now = new Date();
        nextBid.status = 'pending_confirmation';
        nextBid.auctionWonAt = now;
        nextBid.confirmationEmailSentAt = now;
        nextBid.confirmationDeadline = new Date(now.getTime() + CONFIRMATION_HOURS * 60 * 60 * 1000);
        await nextBid.save();

        // Update product highest bid info
        product.highestBidAmount = nextBid.bidAmount;
        product.highestBidderId = nextBid.buyerId;
        await product.save();

        // Send second chance email & notification
        const confirmLink = `${FRONTEND_URL}/my-bids/won`;
        try {
          await emailService.sendSecondChanceEmail(
            nextBuyer.email,
            nextBuyer.firstName,
            product.title,
            nextBid.bidAmount,
            confirmLink
          );
          await notificationService.notifySecondChanceBid(
            nextBid._id,
            product._id,
            product.title,
            nextBid.bidAmount,
            nextBuyer._id
          );
        } catch (e) {
          logger.error('Error sending second chance notifications:', e);
        }

        logger.info(`Cascaded to next bidder for product ${product._id}. Next: ${nextBuyer.email}, Amount: ৳${nextBid.bidAmount}`);
      } catch (bidErr) {
        logger.error(`Error processing expired confirmation for bid ${expiredBid._id}:`, bidErr);
      }
    }
  } catch (err) {
    logger.error('checkConfirmationExpiry error:', err);
  }
}

/**
 * ═══════════════════════════════════════════════
 * JOB 3: Auto-Release Escrow
 * Runs every 5 minutes. Finds completed orders where buyer has
 * confirmed delivery 24+ hours ago and auto-releases escrowed
 * payment to the seller.
 * ═══════════════════════════════════════════════
 */
async function autoReleaseEscrow() {
  try {
    const releaseThreshold = new Date(Date.now() - AUTO_RELEASE_DELAY_HOURS * 60 * 60 * 1000);

    // Find completed orders where delivery was confirmed 24+ hours ago
    // and payment hasn't been released yet
    const eligibleOrders = await Order.find({
      status: 'completed',
      actualDeliveryDate: { $lte: releaseThreshold },
      escrowStatus: 'held'
    });

    for (const order of eligibleOrders) {
      try {
        const payment = await Payment.findOne({ orderId: order._id, status: 'escrowed' });
        if (!payment) continue;

        const seller = await User.findById(order.sellerId);
        if (!seller) continue;

        const product = await Product.findById(order.productId);

        // Release payment
        payment.status = 'released';
        payment.sellerPayoutStatus = 'completed';
        payment.sellerPayoutDate = new Date();
        payment.escrowReleaseDate = new Date();
        payment.platformFeeAmount = PLATFORM_FEE;
        await payment.save();

        // Update order
        order.escrowStatus = 'released';
        order.sellerPaidAt = new Date();
        await order.save();

        // Determine seller's payment method label
        const defaultPayment = seller.paymentMethods?.find(pm => pm.isDefault);
        const paymentMethodLabel = defaultPayment
          ? `${defaultPayment.type} (${defaultPayment.details?.accountNumber?.slice(-4) || defaultPayment.details?.last4 || '****'})`
          : 'registered account';

        // Send payout email to seller
        try {
          await emailService.sendPayoutReceiptEmail(
            seller.email,
            seller.firstName,
            product?.title || 'Product',
            payment.amount,
            PLATFORM_FEE,
            paymentMethodLabel
          );
        } catch (e) {
          logger.error('Error sending payout receipt email:', e);
        }

        // Send in-app notification
        try {
          await notificationService.notifySellerPayout(
            order._id,
            seller._id,
            payment.amount,
            PLATFORM_FEE
          );
        } catch (e) {
          logger.error('Error sending seller payout notification:', e);
        }

        // Update seller transaction count
        await User.findByIdAndUpdate(order.sellerId, {
          $inc: { totalTransactions: 1 }
        });

        logger.info(`Auto-released escrow for order ${order._id}. Seller: ${seller.email}, Amount: ৳${payment.amount - PLATFORM_FEE}`);
      } catch (orderErr) {
        logger.error(`Error auto-releasing escrow for order ${order._id}:`, orderErr);
      }
    }
  } catch (err) {
    logger.error('autoReleaseEscrow error:', err);
  }
}

/**
 * Start all cron jobs
 */
function startAuctionScheduler() {
  // Job 1: Check auction expiry — every minute
  cron.schedule('* * * * *', async () => {
    await checkAuctionExpiry();
  });

  // Job 2: Check confirmation expiry — every minute
  cron.schedule('* * * * *', async () => {
    await checkConfirmationExpiry();
  });

  // Job 3: Auto-release escrow — every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await autoReleaseEscrow();
  });

  logger.info('🕐 Auction Scheduler started: expiry check (1min), confirmation check (1min), escrow release (5min)');
}

module.exports = {
  startAuctionScheduler,
  checkAuctionExpiry,
  checkConfirmationExpiry,
  autoReleaseEscrow
};
