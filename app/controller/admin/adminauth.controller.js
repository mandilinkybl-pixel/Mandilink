const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SecureEmployee = require("../../models/adminEmployee")



class AdminAuthController {

  createAdmin = async (req, res) => {
    try {
      const { name, email, password,mobile } = req.body;

      // Check if admin already exists
      let existingAdmin = await SecureEmployee.findOne({ email });
      if (existingAdmin) {
        return res.status(400).json({ error: "Admin already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create admin
      const admin = new SecureEmployee({
        name,
        email,
        password: hashedPassword,
        role: "admin",   // ✅ Force admin role
        isBlocked: false,
        mobile
      });

      await admin.save();

      return res.status(201).json({ message: "Admin created successfully", admin });
    } catch (err) {
      console.error("Error creating admin:", err);
      return res.status(500).json({ error: "Server error while creating admin" });
    }
  };



  adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Admin login attempt:", email);
    const admin = await SecureEmployee.findOne({ email, role: "admin" });
    console.log("Admin found:", admin);
    if (!admin) {
      return res.redirect("/admin/login");
    }

    if (admin.isBlocked) {
      return res.redirect("/admin/login");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.redirect("/admin/login");
    }

    // ✅ Generate token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );


    // ✅ Set cookie (httpOnly so it's safe)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure only in prod
      sameSite: "strict",
    });
// console.log("✅ Token set in cookie:", token);

    // console.log("✅ Login successful, token issued:", token);

    return res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);
    return res.redirect("/admin/login");
  }
};
// ✅ Admin Logout Controller
adminLogout = async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Redirect to login page after logout
    return res.redirect("/admin/login");
  } catch (err) {
    console.error("Admin logout error:", err);
    return res.redirect("/admin/dashboard"); // fallback
  }
};


}



module.exports = new AdminAuthController();
// Employee Login
// exports.employeeLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const employee = await SecureEmployee.findOne({ email, role: "employee" });
//     if (!employee) {
//       return res.status(401).json({ message: "Employee not found" });
//     }

//     if (employee.isBlocked) {
//       return res.status(403).json({ message: "Your account is blocked" });
//     }

//     const isMatch = await bcrypt.compare(password, employee.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { id: employee._id, role: employee.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.cookie("token", token, { httpOnly: true });
//     res.json({ message: "Employee login successful", token });
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };
