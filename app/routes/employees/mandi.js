const express = require("express");
const router = express.Router();
const mandiController = require("../../controller/employees/mandilist");
const {employeeAuth} = require("../../middleware/authadmin");

// Mandi routes
router.get("/", employeeAuth, mandiController.getMandis);
router.post("/add", employeeAuth, mandiController.addMandi);
router.post("/delete/:id", employeeAuth, mandiController.deleteMandi);
router.post("/update/:id", employeeAuth, mandiController.editMandi);

// API for state → districts
router.get("/districts/:stateId", employeeAuth, mandiController.getDistricts);
// ✅ Route for deleting multiple mandis
router.post("/delete-many", employeeAuth, mandiController.deleteManyMandis);

module.exports = router;
