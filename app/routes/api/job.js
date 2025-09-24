const express = require("express");
const router = express.Router();
const JobController = require("../../controller/api/jobpost");

// POST -> Create Job
router.post("/", (req, res) => JobController.createJob(req, res));

// GET -> All Jobs
router.get("/", (req, res) => JobController.getJobs(req, res));

// GET -> Single Job by ID
router.get("/:id", (req, res) => JobController.getJobById(req, res));

// PUT -> Update Job
router.put("/:id", (req, res) => JobController.updateJob(req, res));

// PATCH -> Deactivate Job
router.patch("/:id/deactivate", (req, res) => JobController.deactivateJob(req, res));

module.exports = router;
// // {
//   "title": "Software Engineer",
//   "companyName": "Mandilink Tech",
//   "location": "Kolkata, India",
//   "description": "Develop and maintain web applications.",
//   "requirements": "Node.js, MongoDB, Express",
//   "salary": "₹50,000-₹70,000",
//   "contactNumber": "9876543210",
//   "contactEmail": "hr@mandilink.in",
//   "jobType": "Full-Time",
//   "postedBy": "650e9b8f1234567890abcdef",
//   "postedByModel": "LISTING"
// // }