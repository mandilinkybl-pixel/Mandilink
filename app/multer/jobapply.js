const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, "../../uploads/jobs"); // or "uploads/resumes"
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// File filter – allow PDF, DOC, DOCX, TXT, and more
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|txt|rtf|odt/; // add any formats you want
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only document files are allowed (PDF, DOC, DOCX, TXT, RTF, ODT)"));
  }
};

// Multer upload instance
const uploadDocs = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter,
});

module.exports = uploadDocs;
