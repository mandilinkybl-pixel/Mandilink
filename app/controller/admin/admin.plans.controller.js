const Plan = require("../../models/plan");
const Category = require("../../models/category.model"); // ✅ use Category instead of Subrole

class PlanController {
  // Create Plan
  async create(req, res) {
    try {
      const {
        name,
        description,
        price,
        duration,
        chatbotDelay,
        chatbotCredits,
        categories = [], // ✅ now multiple categories
      } = req.body;

      // Access features
      const access = {
        chat: !!req.body.chat,
        contact: !!req.body.contact,
        postAds: !!req.body.postAds,
        premiumBadge: !!req.body.premiumBadge,
        jobPost: !!req.body.jobPost,
        bidding: !!req.body.bidding,
        bidPost: !!req.body.bidPost,
        profileHighlight: !!req.body.profileHighlight,
        prioritySupport: !!req.body.prioritySupport,
        unlimitedMessages: !!req.body.unlimitedMessages,
        analytics: !!req.body.analytics,
        boostAds: !!req.body.boostAds,
        multipleLanguages: !!req.body.multipleLanguages,
        featuredPlacement: !!req.body.featuredPlacement,
      };

      const plan = new Plan({
        name,
        description,
        price,
        duration,
        access,
        chatbot: {
          delay: chatbotDelay || 5,
          credits: chatbotCredits || 100,
        },
        categories: Array.isArray(categories) ? categories : [categories], // ✅ handle single/multiple
      });

      await plan.save();
      res.redirect("/admin/plans");
    } catch (err) {
      console.error("Error creating plan:", err);
      res.redirect("/admin/plans");
    }
  }

  // Update Plan
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        duration,
        chatbotDelay,
        chatbotCredits,
        categories = [],
      } = req.body;

      const access = {
        chat: !!req.body.chat,
        contact: !!req.body.contact,
        postAds: !!req.body.postAds,
        premiumBadge: !!req.body.premiumBadge,
        jobPost: !!req.body.jobPost,
        bidding: !!req.body.bidding,
        bidPost: !!req.body.bidPost,
        profileHighlight: !!req.body.profileHighlight,
        prioritySupport: !!req.body.prioritySupport,
        unlimitedMessages: !!req.body.unlimitedMessages,
        analytics: !!req.body.analytics,
        boostAds: !!req.body.boostAds,
        multipleLanguages: !!req.body.multipleLanguages,
        featuredPlacement: !!req.body.featuredPlacement,
      };

      await Plan.findByIdAndUpdate(id, {
        name,
        description,
        price,
        duration,
        access,
        chatbot: {
          delay: chatbotDelay || 5,
          credits: chatbotCredits || 100,
        },
        categories: Array.isArray(categories) ? categories : [categories],
      });

      res.redirect("/admin/plans");
    } catch (err) {
      console.error("Error updating plan:", err);
      res.redirect("/admin/plans");
    }
  }

  // Delete Plan
  async delete(req, res) {
    try {
      const { id } = req.params;
      await Plan.findByIdAndDelete(id);
      res.redirect("/admin/plans");
    } catch (err) {
      console.error("Error deleting plan:", err);
      res.redirect("/admin/plans");
    }
  }
}

module.exports = new PlanController();
