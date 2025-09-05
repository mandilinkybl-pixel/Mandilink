const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

// Create uploads folder if not exists
const uploadDir =  (path.join(__dirname, "../../", "uploads", "ads")); // "/uploads/ads"
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store file temporarily in memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed!"));
  }
};

const uploadads = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, 
  fileFilter
});

// Middleware to convert image -> .webp
const convertToWebp = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const fileName = Date.now() + "-" + Math.round(Math.random() * 1E9) + ".webp";
    const filePath = path.join(uploadDir, fileName);

    await sharp(req.file.buffer)
      .resize(800) // optional: resize width to 800px
      .webp({ quality: 80 }) // compress to webp
      .toFile(filePath);

    req.file.filename = fileName;
    req.file.path = filePath;
    req.file.url = `/uploads/ads/${fileName}`;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadads, convertToWebp };
