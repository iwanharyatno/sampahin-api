const multer = require("multer");
const path = require("path");

const upload = multer({
  storage: multer.memoryStorage(), // store file in memory for Firebase upload
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") cb(null, true);
    else cb(new Error("Only JPG/PNG images are allowed"));
  }
});

module.exports = upload;