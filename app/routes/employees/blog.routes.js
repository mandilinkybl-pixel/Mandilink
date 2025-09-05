const express = require("express");
const router = express.Router();
const AdminBlogController = require("../../controller/employees/blog.controller");
const { upload, convertToWebp } = require("../../multer/blogs.multer");
const { employeeAuth } = require("../../middleware/authadmin");

// ✅ Admin: Create blog
router.post(
  "/create",
  upload.single("image"),
  convertToWebp,
  employeeAuth,
  AdminBlogController.createBlog
);

// ✅ Admin: Manage blogs
router.get("/:id", AdminBlogController.getBlogById);
router.post(
  "/:id",
  upload.single("image"),
  convertToWebp,
  employeeAuth,
  AdminBlogController.updateBlog
);
router.delete("/:id", employeeAuth, AdminBlogController.deleteBlog);

module.exports = router;
