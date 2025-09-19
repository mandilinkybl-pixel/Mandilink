const jwt = require("jsonwebtoken");
const User = require("../models/lisingSchema");
const Company = require("../models/companylisting");

const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user exists in either collection
    let user = await User.findById(decoded.id);
    if (!user) {
      user = await Company.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

module.exports = authMiddleware;
