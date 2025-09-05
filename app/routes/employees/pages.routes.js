const express = require('express');
const router = express.Router();
const pagesController = require('../../controller/employees/pages.controller');
const { employeeAuth } = require('../../middleware/authadmin');

router.get('/dashboard',employeeAuth, pagesController.index);
router.get('/login', pagesController.login);
router.get('/blogs', employeeAuth, pagesController.getAllBlogs);
router.get('/blogs/:id', employeeAuth, pagesController.getBlogById);
router.get('/create-blog', employeeAuth, pagesController.createblog);
router.get('/subroles', employeeAuth, pagesController.rolecreate);
router.get('/total-users', employeeAuth, pagesController.totalusers);
router.get('/jobs', employeeAuth, pagesController.getAllJobs);
router.get('/create-job', employeeAuth, pagesController.createJob);
router.get('/edit-job/:id', employeeAuth, pagesController.editJob);
router.get('/ads', employeeAuth, pagesController.adsPage);
router.get('/top-ads', employeeAuth, pagesController.topAds);
router.get('/sponsored-ads', employeeAuth, pagesController.sponsoredAds);
router.get('/bottom-ads', employeeAuth, pagesController.bottomAds);
router.get('/side-ads', employeeAuth, pagesController.sideAds);
router.get('/plans', employeeAuth, pagesController.plans);
router.get('/commodities', employeeAuth, pagesController.getAllCommodities);
router.get('/commodities/:id', employeeAuth, pagesController.getCommodity);

module.exports = router;
