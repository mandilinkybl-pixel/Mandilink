const BlogPost = require("../../models/blog");
const User = require("../../models/user");
const SecureEmployee = require("../../models/adminEmployee");
const fs = require("fs").promises;
const path = require("path");

class AdminBlogController {
  constructor() {
    this.updateBlog = this.updateBlog.bind(this);
    this.deleteBlog = this.deleteBlog.bind(this);
    this.createBlog = this.createBlog.bind(this);
    this.getBlogById = this.getBlogById.bind(this);
  }

  // Helper function to delete an image
  async deleteImage(imagePath) {
    if (!imagePath || imagePath.startsWith('http')) return; // Skip URLs
    try {
      const fullPath = path.join(__dirname, "../../", imagePath);
      if (await fs.access(fullPath).then(() => true).catch(() => false)) {
        await fs.unlink(fullPath);
      }
    } catch (error) {
      console.error(`Error deleting image ${imagePath}:`, error.message);
    }
  }

  // ✅ Admin: Create blog
  async createBlog(req, res) {
    try {
      const { title, content, tags, authorType, author, image } = req.body;
      const imageUrl = req.file ? req.file.url : (image && image.startsWith('http') ? image : null);

      if (!title || !content) {
        // EJS notification
        return res.redirect("/admin/blogs?error=Title and content are required");
      }

      let authorDoc = await SecureEmployee.findById(author);
      if (!authorDoc) {
        return res.redirect("/admin/blogs?error=Invalid author ID");
      }

      const blog = new BlogPost({
        title,
        content,
        tags: tags ? tags.split(",").map(tag => tag.trim()).filter(tag => tag) : [],
        image: imageUrl,
        author,
        authorType
      });

      await blog.save();

      // If AJAX/API
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(201).json({ message: "Blog created successfully", blog });
      }

      // For EJS
      res.redirect("/admin/blogs?message=Blog created successfully");
    } catch (error) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({ message: "Error creating blog", error: error.message });
      }
      res.redirect("/admin/blogs?error=Error creating blog");
    }
  }

  // ✅ Admin: Get single blog
  async getBlogById(req, res) {
    try {
      const blog = await BlogPost.findById(req.params.id)
        .populate("author_doc", "name email");

      if (!blog) return res.status(404).json({ message: "Blog not found" });

      res.json(blog);
    } catch (error) {
      res.status(500).json({ message: "Error fetching blog", error: error.message });
    }
  }

  // ✅ Admin: Update blog
  async updateBlog(req, res) {
    try {
      const { title, content, tags, image } = req.body;
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.redirect("/admin/blogs?error=Blog not found");

      if (!title || !content) {
        return res.redirect("/admin/blogs?error=Title and content are required");
      }

      const imageUrl = req.file ? req.file.url : (image && image.startsWith('http') ? image : null);
      if (imageUrl && blog.image && blog.image !== imageUrl) {
        await this.deleteImage(blog.image);
      }

      blog.title = title;
      blog.content = content;
      blog.tags = tags ? tags.split(",").map(tag => tag.trim()).filter(tag => tag) : blog.tags;
      blog.image = imageUrl !== null ? imageUrl : blog.image;

      await blog.save();

      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({ message: "Blog updated successfully", blog });
      }

      res.redirect("/admin/blogs?message=Blog updated successfully");
    } catch (error) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({ message: "Error updating blog", error: error.message });
      }
      res.redirect("/admin/blogs?error=Error updating blog");
    }
  }

  // ✅ Admin: Delete blog
  async deleteBlog(req, res) {
  try {
    const blog = await BlogPost.findById(req.params.id);
    if (!blog) {
      // For JSON API
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(404).json({ message: "Blog not found" });
      }
      // For EJS (redirect)
      return res.redirect("/admin/blogs?error=Blog not found");
    }

    // Try to delete image (if local file)
    try {
      await this.deleteImage(blog.image);
    } catch (err) {
      console.error("Image delete error:", err.message);
      // Don't block blog deletion if image deletion fails!
    }

    await BlogPost.findByIdAndDelete(req.params.id);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ message: "Blog deleted successfully" });
    }
    res.redirect("/admin/blogs?message=Blog deleted successfully");
  } catch (error) {
    console.error("Delete error:", error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ message: "Error deleting blog", error: error.message });
    }
    res.redirect("/admin/blogs?error=Error deleting blog");
  }
}
}

module.exports = new AdminBlogController();