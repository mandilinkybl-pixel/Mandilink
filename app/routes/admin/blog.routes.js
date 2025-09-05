const express = require("express");
const router = express.Router();
const AdminBlogController = require("../../controller/admin/blog.controller");
const { upload, convertToWebp } = require("../../multer/blogs.multer");
const { adminAuth } = require("../../middleware/authadmin");

// ✅ Admin: Create blog
router.post(
  "/create",
  upload.single("image"),
  convertToWebp,
  adminAuth,
  AdminBlogController.createBlog
);

// ✅ Admin: Manage blogs
router.get("/:id", AdminBlogController.getBlogById);
router.post(
  "/:id",
  upload.single("image"),
  convertToWebp,
  adminAuth,
  AdminBlogController.updateBlog
);
router.post("/delete/:id", adminAuth, AdminBlogController.deleteBlog);

module.exports = router;
