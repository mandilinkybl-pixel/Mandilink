const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/lisingSchema"); // your user model
const Company = require("../../models/companylisting");   // ✅ fixed import

const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";

class AuthController {
  // Signup
  async signup(req, res) {
    try {
      const {
        userType, name, email, contactNumber, password,
        address, state, district, mandi, category
      } = req.body;

      if (!userType || !name || !email || !contactNumber || !password || !state || !district || !category) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // check duplicates across both models
      const existing =
        (await User.findOne({ $or: [{ email }, { contactNumber }] })) ||
        (await Company.findOne({ $or: [{ email }, { contactNumber }] }));

      if (existing) {
        return res.status(400).json({ message: "Email or phone already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      let account;

      if (userType === "company") {
        account = new Company({
          name,
          email,
          contactNumber,
          passwordHash: hashedPassword,
          address: address || "",
          state,
          district,
          mandi: mandi || "",
          category,
          isVerified: true,
          Verifybatch: "batch1",
          registrationStep: 4,
        });
      } else {
        account = new User({
          name,
          email,
          contactNumber,
          passwordHash: hashedPassword,
          address: address || "",
          state,
          district,
          mandi: mandi || "",
          category,
          isVerified: true,
          Verifybatch: "batch1",
          registrationStep: 3,
        });
      }

      await account.save();
      return res.status(201).json({ message: `${userType} registered successfully`, user: account });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Login
  async login(req, res) {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) return res.status(400).json({ message: "Email/Phone and password required" });

      let account =
        (await User.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })) ||
        (await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] }));

      if (!account) return res.status(404).json({ message: "Account not found" });

      const isMatch = await bcrypt.compare(password, account.passwordHash || "");
      if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

      const type = account instanceof Company ? "company" : "user"; // ✅ fix
      const token = jwt.sign({ id: account._id, userType: type }, JWT_SECRET, { expiresIn: "7d" });

      return res.json({ message: "Login successful", token, user: account });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Forgot Password
  async forgotPassword(req, res) {
    try {
      const { identifier } = req.body;
      let account =
        (await User.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })) ||
        (await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] }));

      if (!account) return res.status(404).json({ message: "Account not found" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // ✅ random 6 digit OTP
      account.resetOtp = otp;
      account.resetOtpExpire = Date.now() + 5 * 60 * 1000;
      await account.save();

      res.json({ message: "OTP sent successfully", otp }); // In production, send OTP via SMS/email instead of returning it
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Reset Password
  async resetPassword(req, res) {
    try {
      const { identifier, otp, newPassword } = req.body;

      let account =
        (await User.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })) ||
        (await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] }));

      if (!account) return res.status(404).json({ message: "Account not found" });
      if (account.resetOtp !== otp || Date.now() > account.resetOtpExpire) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      account.passwordHash = await bcrypt.hash(newPassword, 10);
      account.resetOtp = undefined;
      account.resetOtpExpire = undefined;
      await account.save();

      res.json({ message: "Password reset successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }

  // Logout
  async logout(req, res) {
    return res.json({ message: "Logout successful (discard token client-side)" });
  }
}

module.exports = new AuthController();
