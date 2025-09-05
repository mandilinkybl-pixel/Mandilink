const express = require("express");
const router = express.Router();
const mandirateController = require("../../controller/admin/dealyrateupdatecontroller");
const { adminAuth } = require("../../middleware/authadmin");

router.get("/", adminAuth, mandirateController.getRatesPage);
router.post("/add", adminAuth, mandirateController.addOrUpdateRates);
router.post("/add-multiple-commodities/:mandiRateId", adminAuth, mandirateController.addMultipleCommodities);
router.post("/edit-commodity/:mandiRateId/:commodityId", adminAuth, mandirateController.editCommodity);
router.post("/delete-commodity/:mandiRateId/:commodityId", adminAuth, mandirateController.deleteCommodity);
router.get("/districts/:stateId", adminAuth, mandirateController.getDistricts);
router.get("/mandis/:district", adminAuth, mandirateController.getMandis);

module.exports = router;