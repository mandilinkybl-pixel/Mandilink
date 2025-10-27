const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Listing = require("../../models/lisingSchema"); // your user model
const Company = require("../../models/companylisting");   // ✅ fixed import
const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";
const OTP_SECRET ="cbaisbckjbaskcbjkjabsckjbaskc"
const nodemailer = require("nodemailer");
const path = require("path");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ Check connection to Gmail SMTP
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email config error: ", error);
  } else {
    console.log("✅ Email server is ready to send emails");
  }
});
function otpMailTemplate(name, otp) {
  return `
  <div style="max-width:600px;margin:auto;padding:20px;background:#f6f7fb;font-family:Arial;border-radius:10px;">
    
    <div style="text-align:center;">
      <img src="cid:mandilinklogo" alt="MandiLink" style="width:120px;margin-bottom:10px;">
      <h2 style="color:#0d6efd;margin-bottom:0">MandiLink Security Verification</h2>
    </div>

    <p style="font-size:16px;color:#333;">
      Hi <b>${name}</b>,
    </p>

    <p style="font-size:16px;color:#333;">
      Use the following OTP to verify your identity for resetting your password:
    </p>

    <div style="background:#fff;border:1px dashed #0d6efd;text-align:center;padding:15px;font-size:28px;color:#0d6efd;border-radius:8px;">
      <b>${otp}</b>
    </div>

    <p style="font-size:14px;color:red;margin-top:10px;">
      ⚠️ This OTP will expire in 5 minutes.
    </p>

    <p style="font-size:16px;color:#333;">
      If you didn't request this password reset, please ignore this email.
    </p>

    <br>
    <p style="text-align:center;color:#777;font-size:12px;">
      © ${new Date().getFullYear()} MandiLink | All Rights Reserved.
    </p>
  </div>`;
}

class AuthController {

// Signup
async signup(req, res) {
  try {
    const {
      userType,
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

    // ✅ Step 1: Basic required fields
    if (!name || !contactNumber || !password || !state || !district || !category) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Step 2: Normalize userType → default to 'listing'
    const type = userType?.toLowerCase() === "company" ? "company" : "listing";

    // ✅ Step 3: Check duplicates (email, phone, GST, license)
    const companyQuery = [
      { email },
      { contactNumber },
      ...(gstNumber ? [{ gstNumber }] : []),
      ...(licenseNumber ? [{ licenseNumber }] : [])
    ];

    const existing =
      (await Company.findOne({ $or: companyQuery })) ||
      (await Listing.findOne({ $or: [{ email }, { contactNumber }] }));

    if (existing) {
      return res.status(400).json({ message: "Email, phone, GST, or license number already exists" });
    }

    // ✅ Step 4: Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Step 5: Create new account (based on type)
    let account;
    if (type === "company") {
      account = new Company({
        name,
        email: email || "",
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
        registrationStep: 4
      });
    } else {
      account = new Listing({
        name,
        email: email || "",
        contactNumber,
        passwordHash: hashedPassword,
        address: address || "",
        state,
        district,
        mandi: mandi || "",
        category,
        isVerified: true,
        Verifybatch: "batch1",
        registrationStep: 3
      });
    }

    // ✅ Step 6: Save record
    await account.save();

    // ✅ Step 7: Clean response (remove passwordHash)
    const userObj = account.toObject();
    delete userObj.passwordHash;

    // ✅ Step 8: Response
    return res.status(201).json({
      message: `${type === "company" ? "Company" : "Listing"} registered successfully`,
      collection: type === "company" ? "Company" : "Listing",
      userType: type,
      user: userObj
    });

  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
}


// Login
async login(req, res) {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: "Email/Phone and password required" });

    let account =
      (await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })) ||
      (await Listing.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] }));

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

    const account = await Listing.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })
      || await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] });

    if (!account) return res.status(404).json({ message: "Account not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = Date.now() + 5 * 60 * 1000;

    const token = crypto.createHmac("sha256", OTP_SECRET).update(otp + expire).digest("hex");

    // ✅ Send Email
    await transporter.sendMail({
      from: `"MandiLink" <${process.env.EMAIL_USER}>`,
      to: account.email,
      subject: "Password Reset OTP - MandiLink",
      html: otpMailTemplate(account.name, otp),
      attachments: [{
        filename: "logo.png",
        path: "./uploads/logo.png", // correct path
        cid: "mandilinklogo" // matches the cid in HTML
      }]
    });

    res.json({
      message: "OTP sent successfully",
      token,
      expire
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

async resetPassword(req, res) {
  try {
    const { identifier, otp, token, newPassword, expire } = req.body;

    const account = await Listing.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] })
      || await Company.findOne({ $or: [{ email: identifier }, { contactNumber: identifier }] });

    if (!account) return res.status(404).json({ message: "Account not found" });
    if (Date.now() > expire) return res.status(400).json({ message: "OTP expired" });

    const hash = crypto.createHmac("sha256", OTP_SECRET).update(otp + expire).digest("hex");
    if (hash !== token) return res.status(400).json({ message: "Invalid OTP" });

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
