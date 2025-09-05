const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Sechueemploueeschema = require("../../models/adminEmployee");

class secureEmployeecontroller  {

    // 🔹 Register new employee (Admin Only)
    async createEmployee(req, res) {
        try {
            const { name, email, mobile, password, role, access, adsAccess } = req.body;

            const hashedPassword = await bcrypt.hash(password, 10);

            const newEmployee = new Sechueemploueeschema({
                name,
                email,
                mobile,
                password: hashedPassword,
                role: role || "employee",
                access: Array.isArray(access) ? access : (access ? [access] : []),
                adsAccess: Array.isArray(adsAccess) ? adsAccess : (adsAccess ? [adsAccess] : [])
            });

            await newEmployee.save();
            res.redirect("/admin/employees");
        } catch (err) {
            console.error(err);
            res.status(500).send("Error creating employee");
        }
    }

    // 🔹 Admin can create Admin
    async createAdmin(req, res) {
        try {
            const { name, email, mobile, password, access } = req.body;

            const existing = await Sechueemploueeschema.findOne({ email });
            if (existing) return res.status(400).json({ message: "Email already exists" });

            const hashedPassword = await bcrypt.hash(password, 10);

            const admin = new Sechueemploueeschema({
                name,
                email,
                mobile,
                password: hashedPassword,
                role: "admin",
                access
            });

            await admin.save();
            res.status(201).json({ message: "Admin created successfully", admin });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // 🔹 Login (for Admin & Employee)
    async login(req, res) {
        try {
            const { email, password } = req.body;

            const user = await Sechueemploueeschema.findOne({ email });
            if (!user) return res.status(404).json({ message: "User not found" });
            if (user.isBlocked) return res.status(403).json({ message: "User is blocked" });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

            const token = jwt.sign(
                { id: user._id, role: user.role, access: user.access },
                process.env.JWT_SECRET,
                { expiresIn: "1d" }
            );

            res.status(200).json({ message: "Login successful", token, user });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // 🔹 Update employee (Admin Only)
  updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, role, password, access } = req.body;

    // Prepare updated data
    let updateData = {
      name,
      email,
      mobile,
      role,
      access: Array.isArray(access) ? access : (access ? [access] : [])
    };

    // If password is provided → hash it
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update employee
    const updatedEmployee = await Sechueemploueeschema.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // If no employee found → handle gracefully
    if (!updatedEmployee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // ✅ Only ONE response (no duplicate headers)
    return res.redirect("/admin/employees");

  } catch (err) {
    console.error("Error updating employee:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

    // 🔹 Delete Employee
    async deleteEmployee(req, res) {
        try {
            const { id } = req.params;
            const deleted = await Sechueemploueeschema.findByIdAndDelete(id);
            if (!deleted) return res.status(404).json({ message: "Employee not found" });

            res.status(200).json({ message: "Employee deleted successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

   

    // 🔹 Get All Admins
    async getAllAdmins(req, res) {
        try {
            const admins = await Sechueemploueeschema.find({ role: "admin" });
            res.status(200).json({ admins });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

  
    // 🔹 Update Employee Password (Admin set or Employee self-change)
    async updatePassword(req, res) {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            const updated = await Sechueemploueeschema.findByIdAndUpdate(
                id,
                { password: hashedPassword },
                { new: true }
            );

            if (!updated) return res.status(404).json({ message: "Employee not found" });

            res.status(200).json({ message: "Password updated successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // 🔹 Block/Unblock Employee
    async blockEmployee(req, res) {
        try {
            const { id } = req.params;

            const employee = await Sechueemploueeschema.findById(id);
            if (!employee) return res.redirect("/admin/employees");

            employee.isBlocked = !employee.isBlocked;
            await employee.save();

            res.redirect("/admin/employees");
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new secureEmployeecontroller();
