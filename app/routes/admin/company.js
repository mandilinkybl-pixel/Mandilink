const express = require("express");
const router = express.Router();
const companyController = require("../../controller/admin/companylistingcontroller");
const {adminAuth} = require("../../middleware/authadmin");

// Company listing page/filter
router.get("/", adminAuth, companyController.getCompanies);
router.post("/list", adminAuth, companyController.getCompanies);

// Add companies (multiple)
router.post("/add", adminAuth, companyController.addCompanies);

// Edit and delete
router.post("/edit/:id", adminAuth, companyController.editCompany);
router.get("/delete/:id", adminAuth, companyController.deleteCompany);

// API for dynamic dropdowns
router.get("/districts/:stateId", adminAuth, companyController.getDistricts);
router.get("/mandis/:district", adminAuth, companyController.getMandis);

module.exports = router;