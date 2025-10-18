const Razorpay = require("razorpay");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZOPAYKEY_ID,        // Correct env variable name
  key_secret: process.env.RAZOPAYKEY_SECRET  // Correct env variable name
});

// Test Razorpay connection
const testConnection = async () => {
  try {
    const orders = await razorpay.orders.fetch();
    console.log("✅ Razorpay connection successful");
    return true;
  } catch (error) {
    console.error("❌ Razorpay connection failed:", error.message);
    throw error;
  }
};

// Export with utility methods
module.exports = {
  razorpay,
  testConnection,
  
  // Utility methods
  createCustomer: async (customerData) => {
    return await razorpay.customers.create(customerData);
  },
  
  createOrder: async (orderData) => {
    return await razorpay.orders.create(orderData);
  },
  
  verifyPayment: async (orderId, paymentId, signature) => {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZOPAYKEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");
    return expectedSignature === signature;
  },
  
  createPaymentMethod: async (methodData) => {
    return await razorpay.paymentMethod.create(methodData);
  },
  
  fetchPaymentMethod: async (pmId) => {
    return await razorpay.paymentMethods.fetch(pmId);
  }
};