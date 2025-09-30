const Job = require("../../models/job");

const JobApplication =require("../../models/jobapplymodel")

class JobController {
  // ----------------------
  // Create a Job
  // ----------------------
  async createJob(req, res) {
    try {
      const {
        title,
        companyName,
        location,
        description,
        requirements,
        salary,
        contactNumber,
        contactEmail,
        jobType,
        postedBy,
        postedByModel,
      } = req.body;

      if (!postedBy || !postedByModel) {
        return res.status(400).json({
          success: false,
          error: "`postedBy` and `postedByModel` are required",
        });
      }

      const job = new Job({
        title,
        companyName,
        location,
        description,
        requirements,
        salary,
        contactNumber,
        contactEmail,
        jobType,
        postedBy,
        postedByModel,
        isActive: true,
      });

      await job.save();
      await job.populate({ path: "postedBy", select: "name email contactNumber" });

      res.status(201).json({ success: true, data: job });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Get all Jobs
  // ----------------------
  async getJobs(req, res) {
    try {
      const jobs = await Job.find().populate({
        path: "postedBy",
        select: "name email contactNumber",
      });

      res.status(200).json({ success: true, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Get a single Job by ID
  // ----------------------
  async getJobById(req, res) {
    try {
      const job = await Job.findById(req.params.id).populate({
        path: "postedBy",
        select: "name email contactNumber",
      });

      if (!job) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }

      res.status(200).json({ success: true, data: job });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Update a Job
  // ----------------------
  async updateJob(req, res) {
    try {
      const updatedJob = await Job.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate({
        path: "postedBy",
        select: "name email contactNumber",
      });

      if (!updatedJob) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }

      res.status(200).json({ success: true, data: updatedJob });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Deactivate a Job (PATCH)
  // ----------------------
  async deactivateJob(req, res) {
    try {
      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }

      if (!job.isActive) {
        return res.status(400).json({ success: false, error: "Job already deactivated" });
      }

      job.isActive = false;
      await job.save();
      await job.populate({ path: "postedBy", select: "name email contactNumber" });

      res.status(200).json({
        success: true,
        data: job,
        message: "Job deactivated successfully",
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

   async getMyPostedJobs(req, res) {
    try {
      const { userId } = req.params;

      const jobs = await Job.find({ postedBy: userId })
        .populate({
          path: "postedBy",
          select: "name email contactNumber",
        })
        .lean();

      if (!jobs.length) {
        return res.status(404).json({ success: false, error: "No jobs found for this user" });
      }

      res.status(200).json({ success: true, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Get Applicants for a specific Job
  // ----------------------
  async getJobApplicants(req, res) {
    try {
      const { jobId } = req.params;

      const applicants = await JobApplication.find({ job: jobId })
        .populate("job", "title companyName location")
        .lean();

      if (!applicants.length) {
        return res.status(404).json({ success: false, error: "No applicants found for this job" });
      }

      res.status(200).json({ success: true, data: applicants });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new JobController();
