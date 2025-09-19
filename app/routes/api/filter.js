const express = require("express");
const router = express.Router();
const filterController = require("../../controller/api/filter");

// Categories
router.get("/categories", filterController.getCategories);

// States
router.get("/states", filterController.getStates);

// Districts by state
router.get("/districts/:stateId", filterController.getDistrictsByState);

// Mandis by district
router.get("/mandis/:district", filterController.getMandisByDistrict);

module.exports = router;
