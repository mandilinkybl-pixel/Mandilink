const express = require("express");
const router = express.Router();
const mandiRateController = require("../../controller/api/mandirate");

// 1. Get mandi rates by mandiId
router.get("/:mandiId", (req, res) =>
  mandiRateController.getMandiRates(req, res)
);

// 2. Get mandi rates by userId (user’s location)
router.get("/user/:userId", (req, res) =>
  mandiRateController.getUserLocationRates(req, res)
);

module.exports = router;
