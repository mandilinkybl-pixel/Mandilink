const express = require("express");
const router = express.Router();
const BlockUnblockCompanyController = require("../../controller/admin/blockunblockedCompany");
const { adminAuth } = require("../../middleware/authadmin");
// User listing page/filter
router.get('/', adminAuth, BlockUnblockCompanyController.getalllist);
router.get('/blocked', adminAuth, BlockUnblockCompanyController.blocksUser);
router.get('/block/:id', adminAuth, BlockUnblockCompanyController.blockCompany);
router.get('/unblock/:id', adminAuth, BlockUnblockCompanyController.unblockCompany);

module.exports = router;