const express = require("express");
const router = express.Router();
const employeeController = require("../../controller/employees/authEmployee");

// Login routes

router.post("/login", employeeController.employeesLogin);
router.get("/logout", employeeController.employeesLogout);

module.exports = router;
