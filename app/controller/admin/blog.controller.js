const BlogPost = require("../../models/blog");
const User = require("../../models/user");
const SecureEmployee = require("../../models/adminEmployee");
const Category = require("../../models/category.model");
const fs = require("fs").promises;
const path = require("path");

class AdminBlogController {
  constructor() {
    this.createBlog = this.createBlog.bind(this);
    this.getBlogById = this.getBlogById.bind(this);
    this.updateBlog = this.updateBlog.bind(this);
    this.deleteBlog = this.deleteBlog.bind(this);
  }

  // Helper: delete local image
  async deleteImage(imagePath) {
    if (!imagePath || imagePath.startsWith("http")) return;
    try {
      const fullPath = path.join(__dirname, "../../", imagePath);
      if (await fs.access(fullPath).then(() => true).catch(() => false)) {
        await fs.unlink(fullPath);
      }
    } catch (err) {
      console.error(`Error deleting image ${imagePath}:`, err.message);
    }
  }

  // ✅ Create blog
  async createBlog(req, res) {
    try {
      const { title, content, tags, authorType, author, category, image } = req.body;

      if (!title || !content || !category) {
        return res.redirect("/admin/blogs?error=Title, content, and category are required");
      }

      // Validate author
      let authorDoc;
      if (authorType === "User") authorDoc = await User.findById(author);
      else if (authorType === "SecureEmployee") authorDoc = await SecureEmployee.findById(author);

      if (!authorDoc) return res.redirect("/admin/blogs?error=Invalid author ID");

      // Validate category
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) return res.redirect("/admin/blogs?error=Invalid category ID");

      const imageUrl = req.file ? req.file.url : (image && image.startsWith("http") ? image : null);

      const blog = new BlogPost({
        title,
        content,
        tags: tags ? tags.split(",").map(tag => tag.trim()).filter(tag => tag) : [],
        image: imageUrl,
        author,
        authorType,
        category
      });

      await blog.save();

      if (req.xhr || req.headers.accept.includes("json")) {
        return res.status(201).json({ message: "Blog created successfully", blog });
      }
      res.redirect("/admin/blogs?message=Blog created successfully");

    } catch (err) {
      console.error("Create blog error:", err);
      if (req.xhr || req.headers.accept.includes("json")) {
        return res.status(500).json({ message: "Error creating blog", error: err.message });
      }
      res.redirect("/admin/blogs?error=Error creating blog");
    }
  }

  // ✅ Get single blog
  async getBlogById(req, res) {
    try {
      const blog = await BlogPost.findById(req.params.id)
        .populate("author_doc", "name email")
        .populate("category", "name status");

      if (!blog) return res.status(404).json({ message: "Blog not found" });
      res.json(blog);

    } catch (err) {
      console.error("Fetch blog error:", err);
      res.status(500).json({ message: "Error fetching blog", error: err.message });
    }
  }

  // ✅ Update blog
  async updateBlog(req, res) {
    try {
      const { title, content, tags, category, image } = req.body;
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.redirect("/admin/blogs?error=Blog not found");

      if (!title || !content || !category) {
        return res.redirect("/admin/blogs?error=Title, content, and category are required");
      }

      // Validate category
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) return res.redirect("/admin/blogs?error=Invalid category ID");

      const imageUrl = req.file ? req.file.url : (image && image.startsWith("http") ? image : null);
      if (imageUrl && blog.image && blog.image !== imageUrl) await this.deleteImage(blog.image);

      blog.title = title;
      blog.content = content;
      blog.tags = tags ? tags.split(",").map(tag => tag.trim()).filter(tag => tag) : blog.tags;
      blog.image = imageUrl !== null ? imageUrl : blog.image;
      blog.category = category;

      await blog.save();

      if (req.xhr || req.headers.accept.includes("json")) {
        return res.json({ message: "Blog updated successfully", blog });
      }
      res.redirect("/admin/blogs?message=Blog updated successfully");

    } catch (err) {
      console.error("Update blog error:", err);
      if (req.xhr || req.headers.accept.includes("json")) {
        return res.status(500).json({ message: "Error updating blog", error: err.message });
      }
      res.redirect("/admin/blogs?error=Error updating blog");
    }
  }

  // ✅ Delete blog
  async deleteBlog(req, res) {
    try {
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) {
        if (req.xhr || req.headers.accept.includes("json")) {
          return res.status(404).json({ message: "Blog not found" });
        }
        return res.redirect("/admin/blogs?error=Blog not found");
      }

      await this.deleteImage(blog.image);
      await BlogPost.findByIdAndDelete(req.params.id);

      if (req.xhr || req.headers.accept.includes("json")) {
        return res.json({ message: "Blog deleted successfully" });
      }
      res.redirect("/admin/blogs?message=Blog deleted successfully");

    } catch (err) {
      console.error("Delete blog error:", err);
      if (req.xhr || req.headers.accept.includes("json")) {
        return res.status(500).json({ message: "Error deleting blog", error: err.message });
      }
      res.redirect("/admin/blogs?error=Error deleting blog");
    }
  }
}

module.exports = new AdminBlogController();
