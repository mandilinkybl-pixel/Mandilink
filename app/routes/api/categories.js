const express = require("express");
const router = express.Router();
const categoryController = require("../../controller/api/categories");

// Get all categories
router.get("/", (req, res) => categoryController.getAllCategories(req, res));

module.exports = router;
