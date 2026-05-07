require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");

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

/* ---------------- SESSION (FINAL FIX) ---------------- */
app.set("trust proxy", 1);

app.use(session({
  secret: "bloodbank_secret_key",
  resave: false,
  saveUninitialized: false,

  // 🔥 UNIVERSAL FIX (no create(), no error)
  store: new MongoStore({
    mongoUrl: process.env.MONGO_URI
  }),

  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

/* ---------------- HOME ---------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* ---------------- SIGNUP (PLAIN PASSWORD) ---------------- */
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exist = await User.findOne({ email });
    if (exist) {
      return res.json({ success: false, message: "User already exists" });
    }

    await User.create({
      name,
      email,
      password, // plain text
      role: "user"
    });

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

/* ---------------- LOGIN (PLAIN PASSWORD) ---------------- */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (password !== user.password) {
      return res.json({ success: false, message: "Wrong password" });
    }

    req.session.user = user.email;
    req.session.role = user.role;

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

/* ---------------- DONOR SUMMARY ---------------- */
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

  } catch {
    res.json({ total: 0, Apos: 0, Bpos: 0, Opos: 0, ABpos: 0 });
  }
});

/* ---------------- REQUEST COUNT ---------------- */
app.get("/requests", async (req, res) => {
  try {
    const count = await Request.countDocuments();
    res.json({ count });
  } catch {
    res.json({ count: 0 });
  }
});

/* ---------------- SERVER START ---------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});