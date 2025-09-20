const express = require("express");
const router = express.Router();
const chatbotController = require("../../controller/api/bot");

router.post("/ask", chatbotController.ask);

module.exports = router;
