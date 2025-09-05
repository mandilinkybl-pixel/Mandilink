const express = require("express");
const router = express.Router();
const JobController = require("../../controller/employees/employee.job.controller");
const { employeeAuth } = require("../../middleware/authadmin");

// Job routes
router.post("/create", employeeAuth, JobController.create);
router.get("/edit/:id", employeeAuth, JobController.editForm);
router.post("/update/:id", employeeAuth, JobController.update);
router.get("/delete/:id", employeeAuth, JobController.delete);

module.exports = router;
