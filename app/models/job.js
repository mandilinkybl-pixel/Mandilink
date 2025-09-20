const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      type: [String], // Array of requirements (skills, experience, etc.)
      default: [],
    },
    salary: {
      type: String, // Example: "₹50,000 - ₹70,000 per month"
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
    },
    jobType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Internship", "Contract"],
      default: "Full-Time",
    },

    // 🔹 Allow multiple user types to post jobs
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "postedByModel",   // dynamic reference
    },
    postedByModel: {
      type: String,
      required: true,
      enum: ["SecureEmployee", "Company", "LISTING"], // multiple user types
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
