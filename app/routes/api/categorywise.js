const express = require("express");
const router = express.Router();
const userController = require("../../controller/api/categorywiseuser");

// Get users by category
router.get("/category/:categoryId", (req, res) => userController.getUsersByCategory(req, res));

module.exports = router;
