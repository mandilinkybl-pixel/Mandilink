const express = require('express');
const router = express.Router();

const authcontroller = require('../../controller/admin/adminauth.controller');

// Admin Auth Routes
router.post('/admin-login', authcontroller.adminLogin);
router.get('/admin-logout', authcontroller.adminLogout);

module.exports = router;
