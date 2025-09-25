const express = require("express");
const router = express.Router();
const mandiController = require("../../controller/api/mandi");

// Get mandis (all / state-wise / district-wise)
router.get("/", (req, res) => mandiController.getMandis(req, res));

module.exports = router;
