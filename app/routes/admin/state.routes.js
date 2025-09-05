const express = require("express");
const router = express.Router();
const stateController = require("../../controller/admin/state.controller");
const {adminAuth} = require("../../middleware/authadmin");

// List
router.get("/", adminAuth, stateController.getStates);

// Create
router.post("/create", adminAuth, stateController.addState);

// Update
router.post("/update/:id", adminAuth, stateController.updateState);

// Delete
router.post("/delete/:id", adminAuth, stateController.deleteState);

module.exports = router;
