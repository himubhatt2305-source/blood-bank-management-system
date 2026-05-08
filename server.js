require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const User = require("./models/User");
const Donor = require("./models/donors");
const Request = require("./models/request");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* DB */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB Connected ✔"))
.catch(err => console.log(err));

/* HOME */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* SIGNUP */
app.post("/signup", async (req, res) => {
  try {
    const exist = await User.findOne({ email: req.body.email });
    if (exist) return res.json({ success: false, message: "User exists" });

    await User.create(req.body);
    res.json({ success: true });

  } catch {
    res.json({ success: false });
  }
});

/* LOGIN */
app.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) return res.json({ success: false, message: "User not found" });

    if (user.password !== req.body.password)
      return res.json({ success: false, message: "Wrong password" });

    res.json({ success: true, role: user.role });

  } catch {
    res.json({ success: false });
  }
});

/* DONORS */
app.get("/donors", async (req, res) => {
  try {
    const donors = await Donor.find();
    res.json(donors);
  } catch {
    res.json([]);
  }
});

/* REQUEST COUNT */
app.get("/requests", async (req, res) => {
  const count = await Request.countDocuments();
  res.json({ count });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running ✔"));