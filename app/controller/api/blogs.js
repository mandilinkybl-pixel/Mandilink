const BlogPost = require("../../models/blog");
const User = require("../../models/lisingSchema");
const SecureEmployee = require("../../models/adminEmployee");
const Company = require("../../models/companylisting");
const Category = require("../../models/category.model");
const fs = require("fs").promises;
const path = require("path");

class AdminBlogController {
  constructor() {
    this.createBlog = this.createBlog.bind(this);
    this.getAllBlogs = this.getAllBlogs.bind(this);
    this.getBlogById = this.getBlogById.bind(this);
    this.updateBlog = this.updateBlog.bind(this);
    this.deleteBlog = this.deleteBlog.bind(this);
  }

  // Delete old image helper
  async deleteImage(imagePath) {
    if (!imagePath || imagePath.startsWith("http")) return;
    try {
      const fullPath = path.join(__dirname, "../../", imagePath);
      if (await fs.access(fullPath).then(() => true).catch(() => false)) {
        await fs.unlink(fullPath);
      }
    } catch (err) {
      console.error("Delete image error:", err.message);
    }
  }

  // ---------------- Create Blog ----------------
  async createBlog(req, res) {
    try {
      const { title, content, tags, authorType, author, category } = req.body;

      if (!title || !content || !author || !authorType || !category) {
        return res.status(400).json({ success: false, message: "Title, content, author, authorType, and category are required" });
      }

      // Validate author
      let authorDoc;
      if (authorType === "LISTING") authorDoc = await User.findById(author);
      else if (authorType === "SecureEmployee") authorDoc = await SecureEmployee.findById(author);
      else if (authorType === "Company") authorDoc = await Company.findById(author);
      if (!authorDoc) return res.status(400).json({ success: false, message: "Invalid author" });

      // Validate category
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) return res.status(400).json({ success: false, message: "Invalid category" });

      // Handle image
      let imageUrl = null;
      if (req.file) {
        imageUrl = path.join("/uploads/blogs", req.file.filename);
      }

      const blog = new BlogPost({
        title,
        content,
        tags: tags ? tags.split(",").map(tag => tag.trim()) : [],
        image: imageUrl,
        author,
        authorType,
        category
      });

      await blog.save();
      res.status(201).json({ success: true, message: "Blog created", blog });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error creating blog", error: err.message });
    }
  }

  // ---------------- Get All Blogs ----------------
  async getAllBlogs(req, res) {
    try {
      const blogs = await BlogPost.find()
        .populate("category", "name")
        .populate("author_doc", "name email");
      res.json({ success: true, blogs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching blogs", error: err.message });
    }
  }

  // ---------------- Get Blog by ID ----------------
  async getBlogById(req, res) {
    try {
      const blog = await BlogPost.findById(req.params.id)
        .populate("category", "name")
        .populate("author_doc", "name email");
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
      res.json({ success: true, blog });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching blog", error: err.message });
    }
  }

  // ---------------- Update Blog ----------------
  async updateBlog(req, res) {
    try {
      const { title, content, tags, category } = req.body;
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

      // Update image if new file uploaded
      if (req.file) {
        if (blog.image) await this.deleteImage(blog.image);
        blog.image = path.join("/uploads/blogs", req.file.filename);
      }

      blog.title = title || blog.title;
      blog.content = content || blog.content;
      blog.tags = tags ? tags.split(",").map(tag => tag.trim()) : blog.tags;
      blog.category = category || blog.category;

      await blog.save();
      res.json({ success: true, message: "Blog updated", blog });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error updating blog", error: err.message });
    }
  }

  // ---------------- Delete Blog ----------------
  async deleteBlog(req, res) {
    try {
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

      if (blog.image) await this.deleteImage(blog.image);
      await BlogPost.findByIdAndDelete(req.params.id);

      res.json({ success: true, message: "Blog deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error deleting blog", error: err.message });
    }
  }
}

module.exports = new AdminBlogController();
