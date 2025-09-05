// routes/admin/commodity.routes.js
const express = require("express");
const router = express.Router();
const commodityController = require("../../controller/admin/comidity.controller");


const {adminAuth} = require("../../middleware/authadmin");


router.get("/", adminAuth, commodityController.getAllCommodities);


router.post("/create", adminAuth, commodityController.addCommodity);

// Update
router.post("/update/:id", adminAuth, commodityController.updateCommodity);

// Delete
router.post("/delete/:id", adminAuth, commodityController.deleteCommodity);

module.exports = router;
