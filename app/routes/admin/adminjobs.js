const express = require("express");
const router = express.Router();
const JobController = require("../../controller/admin/adminJob.controller");
const { adminAuth } = require("../../middleware/authadmin");

// Job routes
router.post("/create",adminAuth, JobController.create);
router.get("/edit/:id", adminAuth, JobController.editForm);
router.post("/update/:id", adminAuth, JobController.update);
router.get("/delete/:id", adminAuth, JobController.delete);

module.exports = router;
