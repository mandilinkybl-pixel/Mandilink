const mongoose = require('mongoose');
const { Schema } = mongoose;

const CommentSchema = new Schema({
  user:      { type: Schema.Types.ObjectId, ref: 'User' }, // Only users can comment
  text:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const LikeSchema = new Schema({
  user:      { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// authorType can be 'User' or 'SecureEmployee'
const BlogPostSchema = new Schema({
  title:      { type: String, required: true },
  content:    { type: String, required: true },
  image:      { type: String },
  author:     { type: Schema.Types.ObjectId, required: true },
  authorType: { type: String, required: true, enum: ['User', 'SecureEmployee'] },
  category:   { type: Schema.Types.ObjectId, ref: 'Category', required: true }, // ✅ Added category reference
  tags:       [String],
  comments:   [CommentSchema],
  likes:      [LikeSchema],
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
}, { timestamps: true });

// Dynamic reference for author
BlogPostSchema.virtual('author_doc', {
  ref: doc => doc.authorType,
  localField: 'author',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);
