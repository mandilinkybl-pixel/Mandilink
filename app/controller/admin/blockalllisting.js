const SecureEmployee = require("../../models/adminEmployee");
const Listing = require("../../models/lisingSchema"); // your LISTING model

class BlockUnblockListingController {
  // ✅ Update old missing fields (example: add defaults for new fields later)
  updateOldListingData = async () => {
    try {
      await Listing.updateMany(
        { viewCount: { $exists: false } },
        { $set: { viewCount: 0 } }
      );

      await Listing.updateMany(
        { lastViewedAt: { $exists: false } },
        { $set: { lastViewedAt: new Date() } }
      );

      console.log("✅ Old listing data updated");
    } catch (err) {
      console.error("❌ Error updating old listing data:", err);
    }
  };

  // ✅ Fetch listings (active/blocked filter)
  fetchListings = async (isActive) => {
    return Listing.find({ isActive })
      .populate("user_id", "name email")
      .populate("category", "name")
      .populate("state", "name districts");
  };

  // ✅ Active listings
getAllListings = async (req, res) => {
  try {
    // ✅ Add missing default fields in all listings
    await Listing.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    await Listing.updateMany(
      { isVerified: { $exists: false } },
      { $set: { isVerified: false } }
    );

    // ✅ Fetch only active listings
    const listings = await Listing.find({ isActive: true })
      .populate("user_id", "name email")   // SecureEmployee details
      .populate("category", "name")        // Category name
      .populate("state", "name districts") // State details
      .lean();

    // ✅ Current logged-in user
    const userdetails = await SecureEmployee.findById(req.user.id);

    // ✅ Render to EJS
    return res.render("admin/alllistings", {
      listings,
      user: req.user,
      userdetails,
      authUser: req.user,
    });
  } catch (err) {
    console.error("Error fetching listings:", err);
    req.flash("error_msg", "Error loading listings");
    return res.redirect("/admin/blockedlisting");
  }
};

  // ✅ Blocked listings
  getBlockedListings = async (req, res) => {
    try {
      const listings = await this.fetchListings(false);
      const userdetails = await SecureEmployee.findById(req.user.id);

      return res.render("admin/blockedlistings", {
        listings,
        user: req.user,
        userdetails,
        authUser: req.user,
      });
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error loading blocked listings");
      return res.redirect("/admin/blockedlisting");
    }
  };

  // ✅ Block listing
  blockListing = async (req, res) => {
    try {
      await Listing.findByIdAndUpdate(req.params.id, { isActive: false });
      req.flash("success_msg", "Listing has been blocked successfully");
      return res.redirect("/admin/blockedlisting");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error blocking listing");
      return res.redirect("/admin/blockedlisting");
    }
  };

  // ✅ Unblock listing
  unblockListing = async (req, res) => {
    try {
      await Listing.findByIdAndUpdate(req.params.id, { isActive: true });
      req.flash("success_msg", "Listing has been unblocked successfully");
      return res.redirect("/admin/blockedlisting");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error unblocking listing");
      return res.redirect("/admin/blockedlisting");
    }
  };
}

module.exports = new BlockUnblockListingController();
