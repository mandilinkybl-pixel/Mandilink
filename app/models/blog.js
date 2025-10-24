// models/BlogPost.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Comment schema: Any user type can comment
const CommentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  userModel: { type: String, required: true, enum: ['LISTING', 'SecureEmployee', 'Company'] },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Like schema: Any user type can like
const LikeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  userModel: { type: String, required: true, enum: ['LISTING', 'SecureEmployee', 'Company'] },
  createdAt: { type: Date, default: Date.now }
});

// Share schema: Any user type can share
const ShareSchema = new Schema({
  user: { type: Schema.Types.ObjectId, required: true },
  userModel: { type: String, required: true, enum: ['LISTING', 'SecureEmployee', 'Company'] },
  createdAt: { type: Date, default: Date.now }
});

// BlogPost schema
const BlogPostSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  author: { type: Schema.Types.ObjectId, required: true },
  authorType: { type: String, required: true, enum: ['LISTING', 'SecureEmployee', 'Company'] },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  tags: [String],
  comments: [CommentSchema],
  likes: [LikeSchema],
  shares: [ShareSchema],
}, { timestamps: true });

// Virtual to dynamically populate author info
BlogPostSchema.virtual('author_doc', {
  ref: doc => doc.authorType, // dynamic model
  localField: 'author',
  foreignField: '_id',
  justOne: true
});

// Post-save hook for new blog post notification
BlogPostSchema.post('save', async function(doc) {
  if (this.isNew) { // Only on create
    try {
      const Notification = require('./notification'); // Adjust path
      // Notify all admins or all users about new blog post
      await Notification.createNotification(
        null, null, 
        'new_blog_post', 
        { 
          title: doc.title, 
          category: doc.category 
        }, 
        { notifyAdmins: true }
      );
    } catch (error) {
      console.error('❌ Failed to create new blog post notification:', error);
    }
  }
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.BlogPost || mongoose.model('BlogPost', BlogPostSchema);