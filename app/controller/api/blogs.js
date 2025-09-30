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
    this.addComment = this.addComment.bind(this);
    this.deleteComment = this.deleteComment.bind(this);
    this.addLike = this.addLike.bind(this);
    this.removeLike = this.removeLike.bind(this);
    this.addShare = this.addShare.bind(this);
  }

  // ---------------- Delete old image helper ----------------
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

      let authorDoc;
      if (authorType === "LISTING") authorDoc = await User.findById(author);
      else if (authorType === "SecureEmployee") authorDoc = await SecureEmployee.findById(author);
      else if (authorType === "Company") authorDoc = await Company.findById(author);
      if (!authorDoc) return res.status(400).json({ success: false, message: "Invalid author" });

      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) return res.status(400).json({ success: false, message: "Invalid category" });

      let imageUrl = null;
      if (req.file) imageUrl = path.join("/uploads/blogs", req.file.filename);

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

  // ---------------- Helper: populate comments/likes/shares ----------------
// ---------------- Helper: populate comments/likes/shares ----------------
async populateInteractions(blog) {
  const populateUser = async (userId, userModel) => {
    if (!userId) return null;
    let Model;
    if (userModel === "LISTING") Model = User;
    else if (userModel === "SecureEmployee") Model = SecureEmployee;
    else if (userModel === "Company") Model = Company;
    if (!Model) return null;

    return await Model.findById(userId).select("-password -__v");
  };

  blog = blog.toObject();

  // Replace user field with actual user document
  blog.comments = await Promise.all(
    blog.comments.map(async c => {
      const userDetails = await populateUser(c.user, c.userModel);
      return {
        _id: c._id,
        text: c.text,
        createdAt: c.createdAt,
        user: userDetails
      };
    })
  );

  blog.likes = await Promise.all(
    blog.likes.map(async l => {
      const userDetails = await populateUser(l.user, l.userModel);
      return {
        _id: l._id,
        user: userDetails
      };
    })
  );

  blog.shares = await Promise.all(
    blog.shares.map(async s => {
      const userDetails = await populateUser(s.user, s.userModel);
      return {
        _id: s._id,
        user: userDetails
      };
    })
  );

  // ✅ Populate author details too
  blog.author = await populateUser(blog.author, blog.authorType);

  return blog;
}


  // ---------------- Get All Blogs ----------------
  async getAllBlogs(req, res) {
    try {
      let blogs = await BlogPost.find()
        .populate("category", "name")
        .populate("author_doc", "-password -__v");

      blogs = await Promise.all(blogs.map(blog => this.populateInteractions(blog)));

      res.json({ success: true, blogs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching blogs", error: err.message });
    }
  }

  // ---------------- Get Blog by ID ----------------
  async getBlogById(req, res) {
    try {
      let blog = await BlogPost.findById(req.params.id)
        .populate("category", "name")
        .populate("author_doc", "-password -__v");

      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

      blog = await this.populateInteractions(blog);

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

  // ---------------- Add Comment ----------------
  async addComment(req, res) {
    try {
      const { user, text } = req.body;
      if (!user || !text) {
        return res.status(400).json({ success: false, message: "user and text are required" });
      }

      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

      // Detect user type automatically
      let userModel = null;
      if (await User.exists({ _id: user })) userModel = "LISTING";
      else if (await Company.exists({ _id: user })) userModel = "Company";
      else if (await SecureEmployee.exists({ _id: user })) userModel = "SecureEmployee";
      if (!userModel) return res.status(400).json({ success: false, message: "Invalid user ID" });

      blog.comments.push({ user, userModel, text });
      await blog.save();

      const populatedBlog = await this.populateInteractions(blog);

      res.json({ success: true, message: "Comment added", blog: populatedBlog });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error adding comment", error: err.message });
    }
  }

  // ---------------- Delete Comment ----------------
  async deleteComment(req, res) {
    try {
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

      blog.comments = blog.comments.filter(c => c._id.toString() !== req.params.commentId);
      await blog.save();

      const populatedBlog = await this.populateInteractions(blog);
      res.json({ success: true, message: "Comment deleted", blog: populatedBlog });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error deleting comment", error: err.message });
    }
  }

  // ---------------- Add Like ----------------
  async addLike(req, res) {
    try {
      const { user, userModel } = req.body;
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

      if (!blog.likes.some(l => l.user.toString() === user)) {
        blog.likes.push({ user, userModel });
        await blog.save();
      }

      const populatedBlog = await this.populateInteractions(blog);
      res.json({ success: true, message: "Liked", blog: populatedBlog });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error adding like", error: err.message });
    }
  }

  // ---------------- Remove Like ----------------
  async removeLike(req, res) {
    try {
      const { user } = req.body;
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

      blog.likes = blog.likes.filter(l => l.user.toString() !== user);
      await blog.save();

      const populatedBlog = await this.populateInteractions(blog);
      res.json({ success: true, message: "Like removed", blog: populatedBlog });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error removing like", error: err.message });
    }
  }

  // ---------------- Add Share ----------------
  async addShare(req, res) {
    try {
      const { user, userModel } = req.body;
      const blog = await BlogPost.findById(req.params.id);
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

      blog.shares.push({ user, userModel });
      await blog.save();

      const populatedBlog = await this.populateInteractions(blog);
      res.json({ success: true, message: "Shared", blog: populatedBlog });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error sharing blog", error: err.message });
    }
  }
}

module.exports = new AdminBlogController();
