const express = require("express");
const router = express.Router();
const PurchasePlanController = require("../../controller/admin/purchasedata");
const { adminAuth } = require("../../middleware/authadmin");
const lisingSchema = require("../../models/lisingSchema");
const companylisting = require("../../models/companylisting");
const SecureEmployee = require("../../models/adminEmployee");


// List all purchases
router.get("/all", adminAuth, PurchasePlanController.allPurchases);

// Razorpay: create order
router.post("/create-order", adminAuth, PurchasePlanController.createRazorpayOrder);

// Razorpay: verify payment
router.post("/verify-payment", adminAuth, PurchasePlanController.verifyRazorpayPayment);

router.get("/fetch", adminAuth, async (req, res) => {
  try {
    const model = req.query.model;
    let users = [];

    if (model === "LISTING") users = await lisingSchema.find();
    else if (model === "Company") users = await companylisting.find();
    else if (model === "SecureEmployee") users = await SecureEmployee.find();

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});


// Admin test purchase (without Razorpay)
router.get("/failpurchase", adminAuth, PurchasePlanController.failedPurchases);

module.exports = router;
