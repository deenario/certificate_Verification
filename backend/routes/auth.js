const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth");
const authorize = require("../middleware/authorize");


// Login
router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.post("/social/login",AuthController.socialLogin);
router.post("/reset/request",AuthController.resetRequest);
router.post("/reset/password",AuthController.resetPassword);
router.post("/change/password", authorize, AuthController.changePassword);
router.post("/profile/update", authorize, AuthController.update);

module.exports = router;
