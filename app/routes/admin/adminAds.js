const express = require('express');
const router = express.Router();
const AdController = require('../../controller/admin/admin.ads.controller');
const { adminAuth } = require('../../middleware/authadmin');
const { uploadads, convertToWebp } = require('../../multer/ads.multer');




// Create Ad
router.post('/create', uploadads.single("image"),
  convertToWebp, adminAuth, AdController.createAd);

// Fetch Ads by Type

// Update Ad
router.post('/update/:id', uploadads.single("image"), convertToWebp, adminAuth, AdController.update);
// Delete Ad
router.get('/delete/:id', adminAuth, AdController.delete);

module.exports = router;