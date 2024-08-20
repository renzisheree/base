const { StatusCodes } = require("http-status-codes");
const {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} = require("../errors/customError");
const userModel = require("../model/user.model");
const hashPassword = require("../utils/hashPassword");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

exports.createUser = async (req, res) => {
  const hashedPassword = await hashPassword(req.body.password);

  req.body.password = hashedPassword;
  const user = await userModel.create(req.body);
  sendTokenResponse(user, 201, res);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email }).select("+password");

  if (!user) throw new NotFoundError("There is no user with that email");
  const isValidUser = user && user.matchPassword(req.body.password);
  if (!isValidUser) throw new UnauthorizedError("Invalid credential");
  sendTokenResponse(user, 200, res);
};
exports.logout = async (req, res) => {
  res.cookie("token", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ success: true, data: "user logged out" });
};
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken({ userId: user._id, role: user.role });
  const options = {
    expire: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }
  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({ success: true, token });
};
exports.getMe = async (req, res) => {
  const user = await userModel.findOne({ _id: req.user.userId });
  const userWithoutPassword = user.toJSON();
  if (!user) throw new NotFoundError("User not found");
  res.status(200).json({ success: true, data: userWithoutPassword });
};

exports.forgotPassword = async (req, res) => {
  const user = await userModel.findOne({ email: req.body.email });
  if (!user) throw new NotFoundError("There is no user with that email");
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/user/resetpassword/${resetToken}`;
  const message = `you are receiving this email because you(or someone else ) has requested the reset of a password. Please make a PUT reques to : \n\n ${resetUrl}`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Password reset token",
      message,
    });
    res.status(200).json({
      success: true,
      data: "Email sent",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpired = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse("Email could not be sent", 500));
  }
};
exports.resetPassword = async (req, res) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");
  const user = await userModel.findOne({
    resetPasswordToken,
    resetPasswordExpired: { $gt: Date.now() },
  });
  if (!user) throw new BadRequestError("Invalid token");

  user.password = await hashPassword(req.body.password);
  user.resetPasswordExpired = undefined;
  user.resetPasswordToken = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
};
