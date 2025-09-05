const BlogPost = require("../../models/blog");
const User = require("../../models/user");
const SecureEmployee = require("../../models/adminEmployee");
const fs = require("fs").promises;
const path = require("path");

class AdminBlogController {
  constructor() {
    // Bind methods to ensure 'this' refers to the class instance
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

      // Validate required fields
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      // Validate author
      let authorDoc = await SecureEmployee.findById(author);
      if (!authorDoc) {
        return res.status(400).json({ message: "Invalid author ID" });
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
      res.status(201).json({ message: "Blog created successfully", blog });
    } catch (error) {
      res.status(500).json({ message: "Error creating blog", error: error.message });
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
      if (!blog) return res.status(404).json({ message: "Blog not found" });

      // Validate required fields
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      // Handle image: Delete old image if a new one is provided
      const imageUrl = req.file ? req.file.url : (image && image.startsWith('http') ? image : null);
      if (imageUrl && blog.image && blog.image !== imageUrl) {
        await this.deleteImage(blog.image);
      }

      // Update fields
      blog.title = title;
      blog.content = content;
      blog.tags = tags ? tags.split(",").map(tag => tag.trim()).filter(tag => tag) : blog.tags;
      blog.image = imageUrl !== null ? imageUrl : blog.image;

      await blog.save();
      res.json({ message: "Blog updated successfully", blog });
    } catch (error) {
      res.status(500).json({ message: "Error updating blog", error: error.message });
    }
  }

  // ✅ Admin: Delete blog
   async deleteBlog(req, res) {
    try {
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.status(404).json({ message: "Blog not found" });
  console.log(blog);
      // Delete associated image
      await this.deleteImage(blog.image);

      await BlogPost.findByIdAndDelete(req.params.id);
      res.json({ message: "Blog deleted successfully" });
    } catch (error) {
        console.error("Error deleting blog:", error);
      res.status(500).json({ message: "Error deleting blog", error: error.message });
    }
  }
}

module.exports = new AdminBlogController();