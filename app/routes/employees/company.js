const express = require("express");
const router = express.Router();
const companyController = require("../../controller/employees/companylistingcontroller");
const {employeeAuth} = require("../../middleware/authadmin");

// Company listing page/filter
router.get("/", employeeAuth, companyController.getCompanies);
router.post("/list", employeeAuth, companyController.getCompanies);

// Add companies (multiple)
router.post("/add", employeeAuth, companyController.addCompanies);

// Edit and delete
router.post("/edit/:id", employeeAuth, companyController.editCompany);
router.get("/delete/:id", employeeAuth, companyController.deleteCompany);

// API for dynamic dropdowns
router.get("/districts/:stateId", employeeAuth, companyController.getDistricts);
router.get("/mandis/:district", employeeAuth, companyController.getMandis);

module.exports = router;