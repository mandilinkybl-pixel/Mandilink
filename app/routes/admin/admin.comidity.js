const express = require("express");
const CommodityController = require("../../controller/admin/comidity.controller");
const { adminAuth } = require("../../middleware/authadmin");

const router = express.Router();
const { uploadcommodity, convertToWebpcommodity } = require("../../multer/commodity.multer");

// Create a new commodity
router.post("/", adminAuth, uploadcommodity.single("image"),
  convertToWebpcommodity, CommodityController.createCommodity);

// Update a commodity
router.post("/update/:id", adminAuth, uploadcommodity.single("image"), convertToWebpcommodity, CommodityController.updateCommodity);

// Delete a commodity
// router.delete("/:id", adminAuth, CommodityController.deleteCommodity);

module.exports = router;
