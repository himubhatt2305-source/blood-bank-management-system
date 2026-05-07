require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Donor = require('./models/donors');
const Request = require('./models/request');

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- MONGO ---------------- */
const MONGO_URL = process.env.MONGO_URI;

mongoose.connect(MONGO_URL)
  .then(() => console.log("DB Connected ✔"))
  .catch(err => console.log("DB Error:", err));

/* ---------------- SESSION ---------------- */
app.use(session({
  secret: "bloodbank_secret_key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URL })
}));

/* ---------------- AUTH ---------------- */
function isLoggedIn(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* ---------------- AUTH ---------------- */
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      role: "user"
    });

    res.json({ success: true });

  } catch {
    res.json({ success: false });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.json({ success: false, message: "Wrong password" });

    req.session.user = user.email;
    req.session.role = user.role;

    res.json({ success: true });

  } catch {
    res.json({ success: false });
  }
});

/* ---------------- SUMMARY ONLY (IMPORTANT FIX) ---------------- */

// ❌ NO FULL LIST
app.get('/donors', async (req, res) => {
  const donors = await Donor.find();

  const summary = {
    total: donors.length,
    Apos: donors.filter(d => d.bloodGroup === "A+").length,
    Bpos: donors.filter(d => d.bloodGroup === "B+").length,
    Opos: donors.filter(d => d.bloodGroup === "O+").length,
    ABpos: donors.filter(d => d.bloodGroup === "AB+").length,
  };

  res.json(summary);
});

/* ---------------- BLOOD SEARCH ---------------- */
app.get('/search-blood', async (req, res) => {
  try {
    let blood = req.query.bloodGroup;

    if (!blood) return res.json({ available: false, count: 0 });

    blood = blood.trim().toUpperCase();

    const count = await Donor.countDocuments({ bloodGroup: blood });

    res.json({
      available: count > 0,
      count
    });

  } catch {
    res.status(500).json({ available: false });
  }
});

/* ---------------- REQUEST COUNT ONLY ---------------- */
app.get('/requests', async (req, res) => {
  const count = await Request.countDocuments();
  res.json({ count });
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});