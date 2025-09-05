const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed password

  // Location
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  locationPermission: { type: Boolean, default: false },

language: {
  type: String,
  enum: [
    'en',       // English
    'hi',       // Hindi
    'hinglish', // Hinglish
    'bn',       // Bengali
    'gu',       // Gujarati
    'mr',       // Marathi
    'ta',       // Tamil
    'te',       // Telugu
    'kn',       // Kannada
    'ml',       // Malayalam
    'pa',       // Punjabi
    'ur',       // Urdu
    'or',       // Odia
    'as',       // Assamese
    'kok',      // Konkani
    'mai',      // Maithili
    'ne',       // Nepali
    // add more if needed
  ],
  default: 'en',
}
,

  // Profile Image
  profileImage: { type: String },


  // Profile Info
  profile: {
    address: String,
    city: String,
    state: String,
    pincode: String,
  },

  // Always "user"
  role: { type: String, enum: ["user"], default: "user" },

  // Link to subrole & category
  subrole: { type: mongoose.Schema.Types.ObjectId, ref: "Subrole", required: true },
  category: { type: String, required: true },  // Must exist inside subrole.categories
  verified: { type: Boolean, default: false },
  plan: { type: String, enum: ["free", "premium"], default: "free" },
  planExpiry: { type: Date },
  bio: { type: String, maxlength: 500 },
  planwiseacess: { type: Object }, // e.g. { chat: true, contact: false }

  isActive: { type: Boolean, default: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ isActive: 1, subrole: 1 });

module.exports = mongoose.model("User", UserSchema);
