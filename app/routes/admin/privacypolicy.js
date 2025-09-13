const express = require('express');
const router = express.Router();
const PrivacyPolicyController = require('../../controller/admin/privacypolicy.controlller');
const { adminAuth } = require('../../middleware/authadmin');


// Route to display all privacy policies and the form
router.get('/', adminAuth,  PrivacyPolicyController.getAll);
// Route to create or update a privacy policy
router.post('/save', adminAuth, PrivacyPolicyController.save);

// delete
router.get('/delete/:id', adminAuth, PrivacyPolicyController.delete);


module.exports = router;