const express = require("express");
const router = express.Router();
const mandirateController = require("../../controller/employees/dealyrateupdatecontroller");
const {employeeAuth } = require("../../middleware/authadmin");

router.get("/", employeeAuth, mandirateController.getRatesPage);
router.post("/add", employeeAuth, mandirateController.addOrUpdateRates);
router.post("/add-multiple-commodities/:mandiRateId", employeeAuth, mandirateController.addMultipleCommodities);
router.post("/edit-commodity/:mandiRateId/:commodityId", employeeAuth, mandirateController.editCommodity);
router.post("/delete-commodity/:mandiRateId/:commodityId", employeeAuth, mandirateController.deleteCommodity);
router.get("/districts/:stateId", employeeAuth, mandirateController.getDistricts);
router.get("/mandis/:district", employeeAuth, mandirateController.getMandis);

module.exports = router;