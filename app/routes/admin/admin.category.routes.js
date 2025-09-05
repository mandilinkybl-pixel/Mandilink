const express = require("express");
const router = express.Router();
const categoryController = require("../../controller/admin/admincategory.controller");
const {adminAuth}=require("../../middleware/authadmin")

router.post("/", adminAuth,categoryController.addCategory);
router.put("/:id",adminAuth, categoryController.updateCategory);
router.delete("/:id",adminAuth, categoryController.deleteCategory);

module.exports = router;
