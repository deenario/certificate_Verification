const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth");
const authorize = require("../middleware/authorize");
const Files = require("../middleware/files");


// Login
router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.post("/reset/request",AuthController.resetRequest);
router.post("/reset/password",AuthController.resetPassword);
router.post("/university/create",AuthController.createUniversity);
router.get("/university/admins",AuthController.getUniversityAdmins);
router.get("/university",AuthController.getUniversity);
router.post("/student/create",Files ,AuthController.createStudent);
router.get("/student" ,AuthController.getStudents);
router.get("/verify" ,AuthController.verify);

module.exports = router;
