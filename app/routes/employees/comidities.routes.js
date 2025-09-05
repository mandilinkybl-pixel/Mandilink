const express = require("express");
const CommodityController = require("../../controller/employees/comiditycontroller");
const { employeeAuth } = require("../../middleware/authadmin");

const router = express.Router();
const { uploadcommodity, convertToWebpcommodity } = require("../../multer/commodity.multer");

// Create a new commodity
router.post("/", employeeAuth, uploadcommodity.single("image"),
  convertToWebpcommodity, CommodityController.createCommodity);

// Update a commodity
router.post("/update/:id", employeeAuth, uploadcommodity.single("image"), convertToWebpcommodity, CommodityController.updateCommodity);

// Delete a commodity
// router.delete("/:id", employeeAuth, CommodityController.deleteCommodity);

module.exports = router;
