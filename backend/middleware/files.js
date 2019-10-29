const multer = require("multer");
const mime = require('mime-types');


const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isValid = MIME_TYPE_MAP[file.mimetype];
        let error = new Error("Invalid mime type");
        if (isValid) {
            error = null;
        }
        console.log(mime.lookup("docx"));
        cb(error, "public/certificates");
    },
    filename: (req, file, cb) => {
        const name = file.originalname
            .toLowerCase()
            .split(" ")
            .join("-");
        cb(null, Date.now() + "-" + name);
    }
});

multer();

module.exports = multer({
    storage: storage ,
    limits: { fieldSize: 25 * 1024 * 1024 }
}).single("certificate");