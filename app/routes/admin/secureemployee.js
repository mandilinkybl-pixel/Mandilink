const express = require("express");
const UserController = require("../../controller/admin/SecureEmployeecontroller");
const { adminAuth } = require("../../middleware/authadmin");
const router = express.Router();

// 🔹 Auth
router.post("/login", UserController.login);

// 🔹 Admin actions
router.post("/create-employee", adminAuth, UserController.createEmployee);
router.post("/create-admin", adminAuth, UserController.createAdmin);
router.post("/update-employee/:id", adminAuth, UserController.updateEmployee);
router.get("/delete/:id", adminAuth, UserController.deleteEmployee);
// router.get("/employees", UserController.getAllEmployees);
router.get("/block-employee/:id", adminAuth, UserController.blockEmployee);



module.exports = router;
