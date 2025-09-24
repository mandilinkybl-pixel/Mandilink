const express = require("express");
const router = express.Router();
const PlanController = require("../../controller/api/plans");

// GET all plans
router.get("/", PlanController.getAllPlans)

// GET plan by ID
router.get("/:id", PlanController.getPlanById);

module.exports = router;
