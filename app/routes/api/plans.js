const express = require("express");
const router = express.Router();
const PlanController = require("../../controller/api/plans");

// GET all plans
router.get("/", (req, res) => PlanController.getAll(req, res));

// GET plan by ID
router.get("/:id", (req, res) => PlanController.getById(req, res));

module.exports = router;
