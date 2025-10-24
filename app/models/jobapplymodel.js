// models/JobApplication.js
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

// Add post-save hook for application received notification
jobApplicationSchema.post('save', async function(doc) {
  if (this.isNew && this.status === 'Applied') { // Only on create
    try {
      const Notification = require('./notification'); // Adjust path
      const Job = require('./job');
      const job = await Job.findById(doc.job);
      if (job && job.postedBy) {
        await Notification.createNotification(
          job.postedBy, 
          job.postedByModel, 
          'job_application_received', 
          { 
            jobTitle: job.title, 
            applicantName: doc.fullName 
          }
        );
      }
    } catch (error) {
      console.error('❌ Failed to create job application notification:', error);
    }
  }
});

const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);

module.exports = JobApplication;