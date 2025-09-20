const express = require("express");
const router = express.Router();
const adminBlogController = require("../../controller/api/blogs");
const multer = require("multer");
const path = require("path");
const { convertToWebp,upload } = require("../../multer/blogs.multer"); // your WebP conversion middleware



// Routes
router.post(
  "/create",
  upload.single("image"),
  convertToWebp,
  adminBlogController.createBlog
);

router.get("/", adminBlogController.getAllBlogs);
router.get("/:id", adminBlogController.getBlogById);

router.put(
  "/update/:id",
  upload.single("image"),
  convertToWebp,
  adminBlogController.updateBlog
);

router.delete("/delete/:id", adminBlogController.deleteBlog);

module.exports = router;
