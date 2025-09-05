const express = require('express');
const router = express.Router();
const AdController = require('../../controller/employees/employee.ads.controller');
const { employeeAuth } = require('../../middleware/authadmin');
const { uploadads, convertToWebp } = require('../../multer/ads.multer');




// Create Ad
router.post('/create', uploadads.single("image"),
  convertToWebp, employeeAuth, AdController.createAd);

// Fetch Ads by Type

// Update Ad
router.post('/update/:id', uploadads.single("image"), convertToWebp, employeeAuth, AdController.update);
// Delete Ad
router.get('/delete/:id', employeeAuth, AdController.delete);

module.exports = router;