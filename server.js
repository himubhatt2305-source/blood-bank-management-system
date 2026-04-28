require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- DB ---------------- */
const MONGO_URL = process.env.MONGO_URI;

if (!MONGO_URL) {
  console.log("❌ MONGO_URI not found");
  process.exit(1);
}

mongoose.connect(MONGO_URL)
  .then(() => console.log("DB Connected ✔"))
  .catch(err => console.log("DB Error:", err));

/* ---------------- SESSION ---------------- */
app.use(session({
  secret: "bloodbank_secret_key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URL
  })
}));

/* ---------------- MODELS ---------------- */
const Donor = require('./models/donors');
const Request = require('./models/request');

/* ---------------- AUTH ---------------- */
function isLoggedIn(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

function isAdmin(req, res, next) {
  if (req.session.user === "admin") return next();
  return res.status(403).send("Access Denied");
}

/* ---------------- PAGES ---------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    req.session.user = "admin";
    return res.redirect("/donors.html");
  }

  res.send("Invalid credentials");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

/* ---------------- PROTECTED PAGES ---------------- */
app.get("/donors.html", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/donors.html"));
});

app.get("/requests.html", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/requests.html"));
});

/* ---------------- DONORS ---------------- */
app.get('/donors', isLoggedIn, async (req, res) => {
  const donors = await Donor.find();
  res.json(donors);
});

/* SEARCH (FIXED) */
app.get('/search', isLoggedIn, async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json([]);

  const donors = await Donor.find({
    $or: [
      { name: { $regex: q, $options: "i" } },
      { city: { $regex: q, $options: "i" } },
      { bloodGroup: { $regex: q, $options: "i" } },
      { gender: { $regex: q, $options: "i" } }
    ]
  });

  res.json(donors);
});

/* GENDER FILTER */
app.get('/filter-gender', isLoggedIn, async (req, res) => {
  const gender = req.query.gender;
  if (!gender) return res.json([]);

  const donors = await Donor.find({ gender });
  res.json(donors);
});

/* DELETE (ADMIN ONLY) */
app.delete('/delete-donor/:id', isAdmin, async (req, res) => {
  await Donor.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* REQUESTS */
app.post('/add-request', async (req, res) => {
  await Request.create(req.body);
  res.json({ success: true });
});

app.get('/requests', isLoggedIn, async (req, res) => {
  const data = await Request.find();
  res.json(data);
});

app.put('/accept-request/:id', isAdmin, async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, { status: "Approved" });
  res.json({ success: true });
});

app.put('/reject-request/:id', isAdmin, async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, { status: "Rejected" });
  res.json({ success: true });
});

/* SESSION CHECK */
app.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

/* SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
