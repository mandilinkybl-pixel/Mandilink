const express = require("express");
const router = express.Router();
const mandiController = require("../../controller/admin/mandilist.controller");
const {adminAuth} = require("../../middleware/authadmin");

// Mandi routes
router.get("/", adminAuth, mandiController.getMandis);
router.post("/add", adminAuth, mandiController.addMandi);
router.post("/delete/:id", adminAuth, mandiController.deleteMandi);
router.post("/update/:id", adminAuth, mandiController.editMandi);

// API for state → districts
router.get("/districts/:stateId", adminAuth, mandiController.getDistricts);
// ✅ Route for deleting multiple mandis
router.post("/delete-many", adminAuth, mandiController.deleteManyMandis);

module.exports = router;
