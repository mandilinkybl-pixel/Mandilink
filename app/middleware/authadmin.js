const jwt = require("jsonwebtoken");

// Admin middleware
const adminAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token; // Get token from cookies
    if (!token) {
        console.log("No token found");
      return res.redirect("/admin/login");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.redirect("/admin/login");
    }

    req.user = decoded; // Attach user data
    next();
  } catch (err) {
    console.error("Admin auth error:", err);
    return res.redirect("/admin/login");
  }
};

// Employee middleware
const employeeAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.redirect("/employees/login");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "employee") {
      return res.redirect("/employees/login");
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.redirect("/employees/login");
  }
};

module.exports = { adminAuth, employeeAuth };
