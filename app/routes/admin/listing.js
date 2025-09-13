const express = require("express");
const router = express.Router();
const companyController = require("../../controller/admin/individual");
const {adminAuth} = require("../../middleware/authadmin");

// User listing page/filter
router.get('/', adminAuth, companyController.getUsers);

// Route to handle filtering users (POST )
router.post('/',adminAuth,companyController .getUsers);

// Route to add multiple users (POST /add)
router.post('/add', adminAuth, companyController.addUsers);

// Route to edit a user (POST /edit/:id)
router.post('/edit/:id', adminAuth, companyController.editUser);

// Route to delete a user (POST /delete/:id)
router.get('/delete/:id', adminAuth, companyController.deleteUser);

// Route to get districts by state ID (GET /districts/:stateId)
router.get('/districts/:stateId', adminAuth, companyController.getDistricts);

// Route to get mandis by district (GET /mandis/:district)
router.get('/mandis/:district', adminAuth, companyController.getMandis);

module.exports = router;