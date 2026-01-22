import multer from "multer";

const storage = multer.diskStorage({});

// ✅ Only allow images + limit file size (2MB)
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // ✅ 2MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only image files are allowed (jpg, jpeg, png, webp)"),
        false
      );
    }
  },
});

export default upload;
