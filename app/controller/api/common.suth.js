const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/lisingSchema"); // your user model
const Company = require("../../models/companylisting");   // ✅ fixed import
const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";
const OTP_SECRET ="cbaisbckjbaskcbjkjabsckjbaskc"
class AuthController {

// Signup
async signup(req, res) {
  try {
    const {
      userType, // 'company' or 'listing'
      name,
      email,
      contactNumber,
      password,
      address,
      state,
      district,
      mandi,
      category,
      contactPerson,
      gstNumber,
      licenseNumber
    } = req.body;

    if (!userType || !name || !email || !contactNumber || !password || !state || !district || !category) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check duplicates in both Company and Listing
    const existing =
      (await Company.findOne({ $or: [{ email }, { contactNumber }, { gstNumber }, { licenseNumber }] })) ||
      (await User.findOne({ $or: [{ email }, { contactNumber }] }));

    if (existing) {
      return res.status(400).json({ message: "Email, phone, GST, or license number already exists" });
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
        contactPerson: contactPerson || "",
        gstNumber: gstNumber || "",
        licenseNumber: licenseNumber || "",
        isVerified: true,
        Verifybatch: "batch1",
        registrationStep: 4,
      });
    } else {
      account = new Listing({
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

    return res.status(201).json({
      message: `${userType} registered successfully`,
      user: account,
      userType: userType, // Include model type
    });

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
      (await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })) ||
      (await User.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] }));

    if (!account) return res.status(404).json({ message: "Account not found" });

    const isMatch = await bcrypt.compare(password, account.passwordHash || "");
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const type = account instanceof Company ? "company" : "listing"; // Determine model type
    const token = jwt.sign({ id: account._id, userType: type }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      message: "Login successful",
      token,
      user: account,
      userType: type, // Include model type
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
}


  // Forgot Password
 async forgotPassword(req, res) {
    try {
      const { identifier } = req.body;

      const account =
        (await User.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })) ||
        (await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] }));

      if (!account) return res.status(404).json({ message: "Account not found" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expire = Date.now() + 5 * 60 * 1000; // 5 minutes

      // Create HMAC token: otp + expiry
      const token = crypto
        .createHmac("sha256", OTP_SECRET)
        .update(otp + expire)
        .digest("hex");

      // For testing, send OTP + token to client
      // In production, send OTP via SMS/email and token to client
      res.json({ message: "OTP generated", otp, token, expire });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }

  // 2️⃣ Reset Password with OTP + token
  async resetPassword(req, res) {
    try {
      const { identifier, otp, token, newPassword, expire } = req.body;

      const account =
        (await User.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })) ||
        (await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] }));

      if (!account) return res.status(404).json({ message: "Account not found" });

      // Verify OTP and expiry
      if (Date.now() > expire) {
        return res.status(400).json({ message: "OTP expired" });
      }

      const hash = crypto
        .createHmac("sha256", OTP_SECRET)
        .update(otp + expire)
        .digest("hex");

      if (hash !== token) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      // OTP valid → reset password
      account.passwordHash = await bcrypt.hash(newPassword, 10);
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
