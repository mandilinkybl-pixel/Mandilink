const express = require("express");
const router = express.Router();
const mandiRateController = require("../../controller/api/mandirate");




router.get("/search", mandiRateController.searchMandiRates);
// 1. Get mandi rates by mandiId
router.get("/:mandiId", (req, res) =>
  mandiRateController.getMandiRates
);

// 2. Get mandi rates by userId (user’s location)
router.get("/user/:userId", (req, res) =>
  mandiRateController.getUserLocationRates(req, res)
);

// ✅ Get state-wise mandi rates
router.get("/state/:stateId", mandiRateController.getStateWiseRates);

// ✅ Get district-wise mandi rates
router.get("/district/:districtName", mandiRateController.getDistrictWiseRates);

// ✅ Get all mandi rates (full details)
router.get("/", mandiRateController.getAllMandiRates);

module.exports = router;
