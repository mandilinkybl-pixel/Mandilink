

const express = require('express');
const router = express.Router();
const pagesController = require('../../controller/admin/pages.controller');
const { adminAuth } = require('../../middleware/authadmin');

router.get('/dashboard', adminAuth, pagesController.index);
router.get('/login', pagesController.login);
router.get('/create-employee', adminAuth, pagesController.createEmployee);
router.get('/employees', adminAuth, pagesController.getAllEmployees);
router.get('/edit-employee/:id', adminAuth, pagesController.getEmployeeById);
router.get('/blogs', adminAuth, pagesController.getAllBlogs);
router.get('/blogs/:id', adminAuth, pagesController.getBlogById);
router.get('/create-blog', adminAuth, pagesController.createblog);
router.get('/subroles', adminAuth, pagesController.rolecreate);
router.get('/total-users', adminAuth, pagesController.totalusers);
router.get('/jobs', adminAuth, pagesController.getAllJobs);
router.get('/create-job', adminAuth, pagesController.createJob);
router.get('/edit-job/:id', adminAuth, pagesController.editJob);
router.get('/ads', adminAuth, pagesController.adsPage);
router.get('/top-ads', adminAuth, pagesController.topAds);
router.get('/sponsored-ads', adminAuth, pagesController.sponsoredAds);
router.get('/bottom-ads', adminAuth, pagesController.bottomAds);
router.get('/side-ads', adminAuth, pagesController.sideAds);
router.get('/plans', adminAuth, pagesController.plans);

router.get('/commidities', adminAuth, pagesController.getAllCommodities);
router.get('/commodities/:id', adminAuth, pagesController.getCommodity);

router.get('/mandilist', adminAuth, pagesController.mandiprice);

module.exports = router;
