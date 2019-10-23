const multer = require("multer");
const mime = require('mime-types');


const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "text/plain": "txt",
    "audio/mpeg" : "mp3",
    "audio/wave": "wav",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/pdf": "pdf"
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isValid = MIME_TYPE_MAP[file.mimetype];
        let error = new Error("Invalid mime type");
        if (isValid) {
            error = null;
        }
        console.log(mime.lookup("docx"));
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

multer();

module.exports = multer({
    storage: storage ,
    limits: { fieldSize: 25 * 1024 * 1024 }
}).single("file");