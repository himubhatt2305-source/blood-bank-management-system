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

/* ---------------- MONGO ---------------- */
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
  store: new MongoStore({
    mongoUrl: MONGO_URL
  })
}));

/* ---------------- MODELS ---------------- */
const Donor = require('./models/donors');
const Request = require('./models/request');

/* ---------------- AUTH ---------------- */
function isLoggedIn(req, res, next) {
  if (req.session.user) next();
  else res.redirect("/login");
}

/* ---------------- ROUTES ---------------- */

// HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// LOGIN PAGE
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    req.session.user = username;
    return res.redirect("/donors.html");
  }

  res.send("Invalid credentials");
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// PROTECTED PAGES
app.get("/donors.html", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/donors.html"));
});

app.get("/requests.html", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/requests.html"));
});

/* ---------------- DONORS ---------------- */

// ADD DONOR
app.post('/add-donor', async (req, res) => {
  try {
    await Donor.create(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// GET DONORS
app.get('/donors', async (req, res) => {
  const donors = await Donor.find();
  res.json(donors);
});

// SEARCH DONOR
app.get('/search', async (req, res) => {
  let bg = req.query.bloodGroup;

  if (!bg) return res.json([]);

  bg = decodeURIComponent(bg).trim().toUpperCase();
  const donors = await Donor.find({ bloodGroup: bg });

  res.json(donors);
});

// UPDATE DONOR
app.put('/update-donor/:id', async (req, res) => {
  try {
    await Donor.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

// DELETE DONOR
app.delete('/delete-donor/:id', async (req, res) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

/* ---------------- REQUESTS ---------------- */

// ADD REQUEST
app.post('/add-request', async (req, res) => {
  try {
    await Request.create(req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

// GET REQUESTS
app.get('/requests', async (req, res) => {
  const data = await Request.find();
  res.json(data);
});

// APPROVE REQUEST
app.put('/accept-request/:id', async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, {
    status: "Approved"
  });
  res.json({ success: true });
});

// REJECT REQUEST
app.put('/reject-request/:id', async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, {
    status: "Rejected"
  });
  res.json({ success: true });
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
