require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default; // 🔥 THE FIX: Added .default for Node v24

const User = require("./models/User");
const Donor = require("./models/donors");
const Request = require("./models/request");

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- DATABASE ---------------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected ✔"))
  .catch(err => {
    console.log("DB Error:", err);
    process.exit(1);
  });

/* ---------------- SESSION (FIXED) ---------------- */
app.set("trust proxy", 1);
app.use(session({
  secret: "bloodbank_secret_key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  }),
  cookie: {
    secure: false, 
    maxAge: 1000 * 60 * 60 * 24 
  }
}));

/* ---------------- AUTH ROUTES ---------------- */
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exist = await User.findOne({ email });
    if (exist) return res.json({ success: false, message: "User already exists" });

    await User.create({ name, email, password, role: "user" });
    res.json({ success: true, message: "Signup successful!" });
  } catch (err) { res.json({ success: false }); }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || password !== user.password) {
      return res.json({ success: false, message: "Invalid email or password" });
    }
    req.session.user = user.email;
    req.session.role = user.role;
    res.json({ success: true });
  } catch (err) { res.json({ success: false }); }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

app.get("/me", (req, res) => {
  res.json({ user: req.session.user || null, role: req.session.role || null });
});

/* ---------------- DONOR API ---------------- */
app.get("/donors-list", async (req, res) => {
  try {
    const donors = await Donor.find();
    res.json(donors);
  } catch { res.json([]); }
});

app.get("/donors", async (req, res) => {
  try {
    const donors = await Donor.find();
    res.json({
      total: donors.length,
      Apos: donors.filter(d => d.bloodGroup === "A+").length,
      Bpos: donors.filter(d => d.bloodGroup === "B+").length,
      Opos: donors.filter(d => d.bloodGroup === "O+").length,
      ABpos: donors.filter(d => d.bloodGroup === "AB+").length
    });
  } catch { res.json({ total: 0 }); }
});

app.delete("/delete-donor/:id", async (req, res) => {
  if (req.session.role !== "admin") return res.status(403).send("Denied");
  await Donor.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ---------------- REQUEST API ---------------- */
app.post("/add-request", async (req, res) => {
  try {
    await Request.create({ ...req.body, status: "Pending" });
    res.json({ success: true });
  } catch { res.json({ success: false }); }
});

app.get("/requests-data", async (req, res) => {
  try {
    const requests = await Request.find();
    res.json(requests);
  } catch { res.json([]); }
});

app.put("/accept-request/:id", async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, { status: "Approved" });
  res.json({ success: true });
});

app.put("/reject-request/:id", async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, { status: "Rejected" });
  res.json({ success: true });
});

/* ---------------- SEARCH ---------------- */
app.get("/search-blood", async (req, res) => {
    const { bloodGroup } = req.query;
    const donor = await Donor.findOne({ bloodGroup: bloodGroup.toUpperCase() });
    res.json({ available: !!donor });
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));