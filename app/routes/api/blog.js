const express = require("express");
const router = express.Router();
const adminBlogController = require("../../controller/api/blogs");
const { convertToWebp, upload } = require("../../multer/blogs.multer"); // your WebP conversion middleware

// ---------------- Blog CRUD ----------------
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

// ---------------- Comments ----------------
// Add a comment
router.post("/:id/comment", adminBlogController.addComment);
// Delete a comment
router.delete("/:id/comment/:commentId", adminBlogController.deleteComment);

// ---------------- Likes ----------------
// Add a like
router.post("/:id/like", adminBlogController.addLike);
// Remove a like
router.post("/:id/unlike", adminBlogController.removeLike);

// ---------------- Shares ----------------
// Add a share
router.post("/:id/share", adminBlogController.addShare);

module.exports = router;
