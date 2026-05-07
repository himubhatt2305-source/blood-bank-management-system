require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default; // Fix for Node v24

const User = require("./models/User");
const Donor = require("./models/donors");
const Request = require("./models/request");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected ✔"))
  .catch(err => { console.log("DB Error:", err); process.exit(1); });

app.set("trust proxy", 1);
app.use(session({
  secret: "bloodbank_secret_key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

/* --- AUTH --- */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || password !== user.password) return res.json({ success: false, message: "Invalid credentials" });
  req.session.user = user.email;
  req.session.role = user.role;
  res.json({ success: true });
});

app.get("/logout", (req, res) => { req.session.destroy(() => res.redirect("/login.html")); });

app.get("/me", (req, res) => { res.json({ user: req.session.user || null, role: req.session.role || null }); });

/* --- DATA ROUTES (FIXED FOR FRONTEND) --- */
app.get("/donors-list", async (req, res) => {
  const data = await Donor.find();
  res.json(data);
});

app.get("/requests-data", async (req, res) => {
  const data = await Request.find();
  res.json(data);
});

app.get("/donors", async (req, res) => {
  const d = await Donor.find();
  res.json({
    total: d.length,
    Apos: d.filter(x => x.bloodGroup === "A+").length,
    Bpos: d.filter(x => x.bloodGroup === "B+").length,
    Opos: d.filter(x => x.bloodGroup === "O+").length,
    ABpos: d.filter(x => x.bloodGroup === "AB+").length
  });
});

app.get("/requests", async (req, res) => {
  const count = await Request.countDocuments();
  res.json({ count });
});

app.post("/add-request", async (req, res) => {
  await Request.create({ ...req.body, status: "Pending" });
  res.json({ success: true });
});

app.delete("/delete-donor/:id", async (req, res) => {
  await Donor.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));