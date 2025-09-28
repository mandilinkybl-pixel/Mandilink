const express = require("express");
const router = express.Router();
const PurchasePlanController = require("../../controller/api/purchase");

// Get purchase history
router.get("/history", PurchasePlanController.getUserPurchases);

// Create order
router.post("/create-order", PurchasePlanController.createUserOrder);

// Verify payment
router.post("/verify-payment", PurchasePlanController.verifyUserPayment);

module.exports = router;
