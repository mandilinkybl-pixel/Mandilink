const express = require("express");
const router = express.Router();
const mandirateController = require("../../controller/admin/dealyrateupdatecontroller");
const { adminAuth } = require("../../middleware/authadmin");

// Get the Mandi Rates page with filters
router.get("/", adminAuth, mandirateController.getRatesPage);

// Add or update rates for a mandi
router.post("/add", adminAuth, mandirateController.addOrUpdateRates);

// Add multiple commodities to an existing mandi rate
router.post("/add-multiple-commodities/:mandiRateId", adminAuth, mandirateController.addMultipleCommodities);

// Edit a single commodity rate
router.post("/edit-commodity/:mandiRateId/:commodityId", adminAuth, mandirateController.editCommodity);

// Delete a commodity rate
router.post("/delete-commodity/:mandiRateId/:commodityId", adminAuth, mandirateController.deleteCommodity);

// Delete an entire mandi rate
router.post("/delete/:mandiRateId", adminAuth, mandirateController.deleteMandiRate);

// Get districts for a state (AJAX)
router.get("/districts/:stateId", adminAuth, mandirateController.getDistricts);

// Get mandis for a district (AJAX)
router.get("/mandis/:district", adminAuth, mandirateController.getMandis);

// Export mandi rates as CSV
router.get("/export/csv", adminAuth, mandirateController.exportCSV);

// Export mandi rates as Excel
router.get("/export/excel", adminAuth, mandirateController.exportExcel);

// Export mandi rates as PDF
router.get("/export/pdf", adminAuth, mandirateController.exportPDF);

// Get report data for modal (AJAX)
router.get("/report/:days", adminAuth, mandirateController.getReportData);

module.exports = router;