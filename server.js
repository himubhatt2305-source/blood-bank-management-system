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
  res.status(403).send("Access Denied");
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
    req.session.user = "admin";
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

/* ---------------- PROTECTED PAGES ---------------- */

app.get("/donors.html", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/donors.html"));
});

app.get("/requests.html", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/requests.html"));
});

/* ---------------- DONORS ---------------- */

// ADD DONOR
app.post('/add-donor', isLoggedIn, async (req, res) => {
  try {
    await Donor.create(req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

// GET DONORS
app.get('/donors', isLoggedIn, async (req, res) => {
  const donors = await Donor.find();
  res.json(donors);
});

// SEARCH DONOR
app.get('/search', isLoggedIn, async (req, res) => {
  const q = req.query.q?.trim();

  if (!q) return res.json([]);

  const donors = await Donor.find({
    $or: [
      { name: { $regex: q, $options: "i" } },
      { city: { $regex: q, $options: "i" } },
      { bloodGroup: { $regex: q, $options: "i" } }
    ]
  });

  res.json(donors);
});

// UPDATE DONOR (ADMIN ONLY)
app.put('/update-donor/:id', isAdmin, async (req, res) => {
  try {
    await Donor.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

// DELETE DONOR (ADMIN ONLY)
app.delete('/delete-donor/:id', isAdmin, async (req, res) => {
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
app.get('/requests', isLoggedIn, async (req, res) => {
  const data = await Request.find();
  res.json(data);
});

// APPROVE REQUEST (ADMIN ONLY)
app.put('/accept-request/:id', isAdmin, async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, {
    status: "Approved"
  });
  res.json({ success: true });
});

// REJECT REQUEST (ADMIN ONLY)
app.put('/reject-request/:id', isAdmin, async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, {
    status: "Rejected"
  });
  res.json({ success: true });
});

app.get('/me', (req, res) => {
  res.json({
    user: req.session.user || null
  });
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
