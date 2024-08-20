const { StatusCodes } = require("http-status-codes");
const { NotFoundError, UnauthorizedError } = require("../errors/customError");
const userModel = require("../model/user.model");
const hashPassword = require("../utils/hashPassword");

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
};
