const express = require("express");
const {
  createUser,
  login,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controller/user.controller");
const router = express.Router();

router.route("/register").post(createUser);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/forgotPassword").post(forgotPassword);
router.route("/resetpassword/:resettoken").put(resetPassword);

module.exports = router;
