// utils/emailTransporter.js (or in your controller)
const nodemailer = require("nodemailer");
const logger = require("./logger");

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    try {
      // Gmail configuration
      this.transporter = nodemailer.createTransporter({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false // For development, set to true in production
        }
      });

      // Test connection
      this.verify();
    } catch (error) {
      logger.error("Failed to initialize email service", { error: error.message });
    }
  }

  async verify() {
    if (!this.transporter) {
      logger.error("No transporter available for verification");
      return false;
    }

    try {
      const result = await this.transporter.verify();
      logger.info("Email transporter verified successfully", {
        service: "Gmail",
        user: process.env.EMAIL_USER
      });
      return true;
    } catch (error) {
      logger.error("Email transporter verification failed", {
        error: error.message,
        code: error.code,
        response: error.response,
        user: process.env.EMAIL_USER
      });

      // Provide specific guidance for common errors
      if (error.response && error.response.includes("535-5.7.8")) {
        logger.error(`
🚨 GMAIL AUTHENTICATION FAILED! 🚨

This error occurs because:
1. Google requires 2-Factor Authentication + App Passwords
2. "Less secure app access" is disabled

FIX:
1. Enable 2FA on your Google account
2. Generate App Password: Google Account → Security → 2FA → App passwords
3. Use the 16-character app password in EMAIL_PASS (NOT your regular password)

Environment variables needed:
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # 16-char app password
        `);
      }

      return false;
    }
  }

  async sendEmail(options) {
    if (!this.transporter) {
      logger.error("Email transporter not available");
      return { success: false, error: "Email service not available" };
    }

    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || `"No Reply" <${process.env.EMAIL_USER}>`,
        ...options,
        // Ensure HTML is properly formatted
        html: options.html || options.text
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info("Email sent successfully", {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject
      });

      return { 
        success: true, 
        messageId: info.messageId,
        message: "Email sent successfully"
      };
    } catch (error) {
      logger.error("Failed to send email", {
        to: options.to,
        subject: options.subject,
        error: error.message,
        code: error.code
      });
      
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
  }

  // Convenience method for purchase confirmation
  async sendPurchaseConfirmation(userEmail, purchaseDetails) {
    return this.sendEmail({
      to: userEmail,
      subject: `Purchase Confirmed - Order #${purchaseDetails.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ Purchase Confirmed!</h2>
          <p>Dear ${purchaseDetails.userName},</p>
          <p>Your purchase has been successfully processed.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3>Order Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Plan:</strong> ${purchaseDetails.planName}</li>
              <li><strong>Amount:</strong> ₹${purchaseDetails.amount}</li>
              <li><strong>Order ID:</strong> ${purchaseDetails.orderId}</li>
              <li><strong>Valid Until:</strong> ${new Date(purchaseDetails.endDate).toLocaleDateString()}</li>
              <li><strong>Purchase ID:</strong> ${purchaseDetails.purchaseId}</li>
            </ul>
          </div>
          
          <p>Thank you for your purchase!</p>
          <p><small>This is an automated message. Please do not reply.</small></p>
        </div>
      `
    });
  }
}

// Create singleton instance
const emailService = new EmailService();
module.exports = emailService;