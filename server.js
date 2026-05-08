require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const User = require("./models/User");
const Donor = require("./models/donors");
const Request = require("./models/request");

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- HOME ---------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* ---------------- DB ---------------- */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB Connected ✔"))
.catch(err => console.log(err));

/* ---------------- LOGIN (FIXED) ---------------- */
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.password !== password) {
      return res.json({ success: false, message: "Wrong password" });
    }

    res.json({
      success: true,
      role: user.role,
      username: user.username
    });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

/* ---------------- ADD DONOR ---------------- */
app.post("/add-donor", async (req, res) => {
  try {
    await Donor.create(req.body);
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

/* ---------------- GET DONORS ---------------- */
app.get("/donors", async (req, res) => {
  try {
    const donors = await Donor.find();
    res.json(donors);
  } catch (err) {
    console.log(err);
    res.json([]);
  }
});

/* ---------------- GET REQUESTS ---------------- */
app.get("/requests", async (req, res) => {
  try {
    const requests = await Request.find();
    res.json(requests);
  } catch (err) {
    console.log(err);
    res.json([]);
  }
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});