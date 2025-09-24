const express = require("express");
const router = express.Router();
const JobApplicationController = require("../../controller/api/applyjob");
const uploadDocs = require("../../multer/jobapply"); 


// Apply for a job (resume optional)
router.post(
  "/:jobId/apply",
  uploadDocs.single("resume"),// field name in form-data
  (req, res) => JobApplicationController.applyJob(req, res)
);

router.get("/", (req, res) => JobApplicationController.getAllApplications(req, res));
router.get("/job/:jobId", (req, res) =>
  JobApplicationController.getApplicationsByJob(req, res)
);
router.get("/:id", (req, res) =>
  JobApplicationController.getApplicationById(req, res)
);
router.put("/:id/status", (req, res) =>
  JobApplicationController.updateApplicationStatus(req, res)
);
router.delete("/:id", (req, res) =>
  JobApplicationController.deleteApplication(req, res)
);

module.exports = router;
