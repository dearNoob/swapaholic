const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from: `"Swapaholic Security" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Your Verification Code - Swapaholic',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verification Code</h2>
          <p>Your One-Time Password (OTP) for Swapaholic is:</p>
          <h1 style="color: #4F46E5; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
        };

        const info = await transporter.sendMail(mailOptions);
        try {
            logger.info(`Email sent to ${email}: ${info.messageId}`);
        } catch (logError) {
            console.error('Logging failed:', logError);
        }
        return true;
    } catch (error) {
        logger.error('Error sending email:', error);
        return false;
    }
};

const sendLogisticsApprovalEmail = async (email, firstName) => {
    try {
        const mailOptions = {
            from: `"Swapaholic Operations" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🎉 Your Logistics Officer Account is Approved — Swapaholic',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #0d9488, #0891b2); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Account Approved!</h1>
          </div>
          <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p style="color: #374151; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color: #4b5563;">Great news! Your <strong>Logistics Officer</strong> account on Swapaholic has been approved by our admin team.</p>
            <p style="color: #4b5563;">You can now log in to your logistics portal and start managing QC inspections and deliveries.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/logistics/login"
                 style="background: linear-gradient(135deg, #0d9488, #0891b2); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Login to Logistics Portal →
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">If you have any questions, please contact our support team.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 15px;">Swapaholic Operations Team</p>
        </div>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Logistics approval email sent to ${email}`);
        return true;
    } catch (error) {
        logger.error('Error sending logistics approval email:', error);
        return false;
    }
};

const sendLogisticsRejectionEmail = async (email, firstName, reason) => {
    try {
        const mailOptions = {
            from: `"Swapaholic Operations" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Logistics Officer Application Update — Swapaholic',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: #dc2626; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Application Update</h1>
          </div>
          <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p style="color: #374151; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="color: #4b5563;">We regret to inform you that your Logistics Officer application has not been approved at this time.</p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
              <p style="color: #991b1b; margin: 0;"><strong>Reason:</strong> ${reason}</p>
            </div>
            <p style="color: #4b5563;">You may re-apply after addressing the reason mentioned above.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 15px;">Swapaholic Operations Team</p>
        </div>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Logistics rejection email sent to ${email}`);
        return true;
    } catch (error) {
        logger.error('Error sending logistics rejection email:', error);
        return false;
    }
};

// ═══════════════════════════════════════════════
// POST-AUCTION WORKFLOW EMAILS
// ═══════════════════════════════════════════════

const sendAuctionWonEmail = async (email, buyerName, productTitle, winningPrice, confirmLink) => {
    try {
        const mailOptions = {
            from: `"Swapaholic Auctions" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🎉 Congratulations! You Won — "${productTitle}" — Swapaholic`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 You Won the Auction!</h1>
          </div>
          <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p style="color: #374151; font-size: 16px;">Hi <strong>${buyerName}</strong>,</p>
            <p style="color: #4b5563;">Congratulations! You have won the auction for:</p>
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 4px; margin: 16px 0;">
              <p style="color: #166534; margin: 0; font-size: 18px;"><strong>${productTitle}</strong></p>
              <p style="color: #166534; margin: 8px 0 0 0; font-size: 22px;">Winning Price: <strong>৳${winningPrice}</strong></p>
              <p style="color: #166534; margin: 4px 0 0 0; font-size: 13px;">+ ৳30 Platform Fee</p>
            </div>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
              <p style="color: #92400e; margin: 0;"><strong>⏰ Important:</strong> You have <strong>3 hours</strong> to confirm your purchase. If you do not confirm, your buyer rating will be reduced and the next bidder will be offered this product.</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmLink}"
                 style="background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Confirm Purchase →
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">After confirming, you will be redirected to make the payment.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 15px;">Swapaholic Auction Team</p>
        </div>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Auction won email sent to ${email}`);
        return true;
    } catch (error) {
        logger.error('Error sending auction won email:', error);
        return false;
    }
};

const sendSecondChanceEmail = async (email, buyerName, productTitle, price, confirmLink) => {
    try {
        const mailOptions = {
            from: `"Swapaholic Auctions" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🔔 Second Chance — "${productTitle}" is Available! — Swapaholic`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #ea580c, #f59e0b); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Second Chance Offer!</h1>
          </div>
          <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p style="color: #374151; font-size: 16px;">Hi <strong>${buyerName}</strong>,</p>
            <p style="color: #4b5563;">Good news! The previous winning bidder did not confirm their purchase, so you now have the opportunity to buy:</p>
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 4px; margin: 16px 0;">
              <p style="color: #166534; margin: 0; font-size: 18px;"><strong>${productTitle}</strong></p>
              <p style="color: #166534; margin: 8px 0 0 0; font-size: 22px;">Your Bid Price: <strong>৳${price}</strong></p>
              <p style="color: #166534; margin: 4px 0 0 0; font-size: 13px;">+ ৳30 Platform Fee</p>
            </div>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
              <p style="color: #92400e; margin: 0;"><strong>⏰ You have 3 hours</strong> to confirm your purchase.</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmLink}"
                 style="background: linear-gradient(135deg, #ea580c, #f59e0b); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Confirm Purchase →
              </a>
            </div>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 15px;">Swapaholic Auction Team</p>
        </div>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Second chance email sent to ${email}`);
        return true;
    } catch (error) {
        logger.error('Error sending second chance email:', error);
        return false;
    }
};

const sendConfirmationExpiredEmail = async (email, buyerName, productTitle) => {
    try {
        const mailOptions = {
            from: `"Swapaholic Auctions" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `⚠️ Confirmation Expired — "${productTitle}" — Swapaholic`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: #dc2626; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Confirmation Expired</h1>
          </div>
          <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p style="color: #374151; font-size: 16px;">Hi <strong>${buyerName}</strong>,</p>
            <p style="color: #4b5563;">Your 3-hour confirmation window for <strong>"${productTitle}"</strong> has expired. Since you did not confirm the purchase:</p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
              <p style="color: #991b1b; margin: 0;">• Your buyer rating has been reduced by 0.5 stars</p>
              <p style="color: #991b1b; margin: 4px 0 0 0;">• The product has been offered to the next highest bidder</p>
            </div>
            <p style="color: #6b7280; font-size: 13px;">Please ensure you confirm future auction wins within the allotted time to maintain your buyer rating.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 15px;">Swapaholic Auction Team</p>
        </div>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Confirmation expired email sent to ${email}`);
        return true;
    } catch (error) {
        logger.error('Error sending confirmation expired email:', error);
        return false;
    }
};

const sendPayoutReceiptEmail = async (email, sellerName, productTitle, amount, platformFee, paymentMethod) => {
    try {
        const netAmount = amount - platformFee;
        const mailOptions = {
            from: `"Swapaholic Payments" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `💰 Payment Received — ৳${netAmount} — Swapaholic`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💰 Payment Received!</h1>
          </div>
          <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p style="color: #374151; font-size: 16px;">Hi <strong>${sellerName}</strong>,</p>
            <p style="color: #4b5563;">Great news! The buyer has received the product and your payment has been released.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="color: #4b5563; padding: 4px 0;">Product</td><td style="color: #166534; font-weight: bold; text-align: right;">${productTitle}</td></tr>
                <tr><td style="color: #4b5563; padding: 4px 0;">Sale Amount</td><td style="color: #166534; text-align: right;">৳${amount}</td></tr>
                <tr><td style="color: #4b5563; padding: 4px 0;">Platform Fee</td><td style="color: #dc2626; text-align: right;">- ৳${platformFee}</td></tr>
                <tr style="border-top: 2px solid #22c55e;"><td style="color: #166534; padding: 8px 0; font-weight: bold; font-size: 18px;">Net Amount</td><td style="color: #166534; font-weight: bold; font-size: 18px; text-align: right;">৳${netAmount}</td></tr>
              </table>
            </div>
            <p style="color: #4b5563;">The amount has been sent to your <strong>${paymentMethod || 'registered account'}</strong>.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 15px;">Swapaholic Payments Team</p>
        </div>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Payout receipt email sent to ${email}`);
        return true;
    } catch (error) {
        logger.error('Error sending payout receipt email:', error);
        return false;
    }
};

const sendPaymentConfirmationEmail = async (email, buyerName, productTitle, amount) => {
    try {
        const mailOptions = {
            from: `"Swapaholic Payments" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `✅ Payment Successful — "${productTitle}" — Swapaholic`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Payment Successful</h1>
          </div>
          <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p style="color: #374151; font-size: 16px;">Hi <strong>${buyerName}</strong>,</p>
            <p style="color: #4b5563;">Your payment for <strong>"${productTitle}"</strong> has been processed successfully!</p>
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 4px; margin: 16px 0;">
              <p style="color: #166534; margin: 0; font-size: 18px;">Amount Paid: <strong>৳${amount}</strong></p>
              <p style="color: #166534; margin: 4px 0 0 0; font-size: 13px;">(Includes ৳30 platform fee)</p>
            </div>
            <p style="color: #4b5563;">Your order is now being processed. The seller will ship the product soon.</p>
            <p style="color: #6b7280; font-size: 13px;">Your payment is held securely in escrow until you confirm receipt of the product.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 15px;">Swapaholic Payments Team</p>
        </div>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Payment confirmation email sent to ${email}`);
        return true;
    } catch (error) {
        logger.error('Error sending payment confirmation email:', error);
        return false;
    }
};

module.exports = {
    sendOTP,
    sendLogisticsApprovalEmail,
    sendLogisticsRejectionEmail,
    sendAuctionWonEmail,
    sendSecondChanceEmail,
    sendConfirmationExpiredEmail,
    sendPayoutReceiptEmail,
    sendPaymentConfirmationEmail,
};
