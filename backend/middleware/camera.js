const multer = require("multer");

const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let error = null;
        cb(error, "public/files");
    },
    filename: (req, file, cb) => {
        const name = file.originalname
            .toLowerCase()
            .split(" ")
            .join("-");
        cb(null, Date.now() + "-" + name);
    }
});

module.exports = multer({ storage: storage }).single("file");