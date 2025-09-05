const express = require("express");
const router = express.Router();
const SubroleController = require("../../controller/admin/subrole.controller");
const { adminAuth } = require("../../middleware/authadmin");

// List & search
router.get("/", adminAuth, SubroleController.getSubroles);

// Create
router.post("/create", adminAuth, SubroleController.createSubrole);

// Update
router.post("/update/:id", adminAuth, SubroleController.updateSubrole);

// Delete
router.get("/delete/:id", adminAuth, SubroleController.deleteSubrole);

module.exports = router;
