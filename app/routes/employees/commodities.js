// routes/employees/commodity.routes.js
const express = require("express");
const router = express.Router();
const commodityController = require("../../controller/employees/comidity.controller");


const {employeeAuth} = require("../../middleware/authadmin");

// List page
router.get("/", employeeAuth, commodityController.getAllCommodities);

// Create
router.post("/create", employeeAuth, commodityController.addCommodity);

// Update
router.post("/update/:id", employeeAuth, commodityController.updateCommodity);

// Delete
router.post("/delete/:id", employeeAuth, commodityController.deleteCommodity);

module.exports = router;
