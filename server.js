const express = require("express");
const dotenv = require("dotenv");
const user = require("./routes/user.routes");
const { default: mongoose } = require("mongoose");

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/v1/user", user);
app.get("/", (req, res) => {
  res.send(process.env.MSG);
});

const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("MONGODB connected");
    app.listen(PORT, () => {
      console.log("Server is running on port " + PORT);
    });
  })
  .catch((error) => {
    console.error(error);
  });
