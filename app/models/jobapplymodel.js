const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },

    fullName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    resume: {
      type: String, // store resume file URL or path
    },

    whyInterested: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Applied", "Shortlisted", "Rejected", "Hired"],
      default: "Applied",
    },
  },
  { timestamps: true }
);

const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);

module.exports = JobApplication;
