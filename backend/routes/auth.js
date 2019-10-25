const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth");
const authorize = require("../middleware/authorize");
const Files = require("../middleware/files");


// Login
router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.post("/reset/request",authorize,AuthController.resetRequest);
router.post("/reset/password",authorize,AuthController.resetPassword);
router.post("/university/create",AuthController.createUniversity);
router.get("/university/admins",AuthController.getUniversityAdmins);
router.post("/student/create",AuthController.createStudent);


module.exports = router;
