const express = require("express");
const router = express.Router();
const companyController = require("../../controller/employees/listing");
const {employeeAuth} = require("../../middleware/authadmin");

// User listing page/filter
router.get('/', employeeAuth, companyController.getUsers);

// Route to handle filtering users (POST )
router.post('/',employeeAuth,companyController .getUsers);

// Route to add multiple users (POST /add)
router.post('/add', employeeAuth, companyController.addUsers);

// Route to edit a user (POST /edit/:id)
router.post('/edit/:id', employeeAuth, companyController.editUser);

// Route to delete a user (POST /delete/:id)
router.post('/delete/:id', employeeAuth, companyController.deleteUser);

// Route to get districts by state ID (GET /districts/:stateId)
router.get('/districts/:stateId', employeeAuth, companyController.getDistricts);

// Route to get mandis by district (GET /mandis/:district)
router.get('/mandis/:district', employeeAuth, companyController.getMandis);

module.exports = router;