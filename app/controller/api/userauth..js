const User = require("../../models/lisingSchema");
const bcrypt = require("bcryptjs");

class UserController {
  // STEP 1: Basic Info
  async step1(req, res) {
    try {
      const { name, email, phone, password } = req.body;

      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: "Email already registered" });

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        name,
        email,
        phone,
        password: hashedPassword
      });

      await user.save();
      res.status(201).json({ message: "Step 1 completed", userId: user._id });
    } catch (error) {
      res.status(500).json({ message: "Error in user step1", error: error.message });
    }
  }

  // STEP 2: State/District/Mandi + Address
  async step2(req, res) {
    try {
      const { userId, state, district, mandi, address } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { state, district, mandi, address },
        { new: true }
      );

      if (!user) return res.status(404).json({ message: "User not found" });

      res.json({ message: "Step 2 completed", user });
    } catch (error) {
      res.status(500).json({ message: "Error in user step2", error: error.message });
    }
  }

  // STEP 3: Category + Finalize
  async step3(req, res) {
    try {
      const { userId, category } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          category,
          isVerified: true,
          Verifybatch: "batch1" // ✅ default set
        },
        { new: true }
      );

      if (!user) return res.status(404).json({ message: "User not found" });

      res.json({ message: "Step 3 completed, User Verified", user });
    } catch (error) {
      res.status(500).json({ message: "Error in user step3", error: error.message });
    }
  }
}

module.exports = new UserController();
