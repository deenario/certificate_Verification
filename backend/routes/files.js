const express = require("express");
const authorize = require("../middleware/authorize");
const router = express.Router();
const FilesController = require("../controllers/files");
const Files = require("../middleware/files");
const Camera = require("../middleware/camera");

router.post("/files/camera", authorize, Files, FilesController.camera);
router.post("/files/upload", authorize , Files, FilesController.upload);
router.get("/files", authorize, FilesController.gallery);
router.post("/files/verify", Files, FilesController.verify);


module.exports = router;
