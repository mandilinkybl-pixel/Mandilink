const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Sechueemploueeschema = require("../../models/adminEmployee")
class authEmployee {
  employeesLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const employees = await Sechueemploueeschema.findOne({ email, role: "employee", isBlocked: false });

   

    if (!employees) {
      return res.redirect("/employees/login");
    }

    if (employees.isBlocked) {
      return res.redirect("/employees/login");
    }

    const isMatch = await bcrypt.compare(password, employees.password);
    if (!isMatch) {
      return res.redirect("/employees/login");
    }

    // ✅ Generate token
    const token = jwt.sign(
      { id: employees._id, role: employees.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Set cookie (httpOnly so it's safe)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure only in prod
      sameSite: "strict",
    });

    // console.log("✅ Login successful, token issued:", token);

    return res.redirect("/employees/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);
    return res.redirect("/employees/login");
  }
};
// ✅ Admin Logout Controller
employeesLogout = async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Redirect to login page after logout
    return res.redirect("/employees/login");
  } catch (err) {
    console.error("employee logout error:", err);
    return res.redirect("/employees/dashboard"); // fallback
  }
};


}


module.exports = new authEmployee();