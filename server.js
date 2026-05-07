require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcryptjs");
const User = require("./models/User");

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

/* ---------------- SIGNUP ---------------- */

app.post("/signup", async (req,res)=>{

try{

const {name,email,password}=req.body;

const existing=await User.findOne({email});

if(existing){

return res.json({
success:false,
message:"Email already exists"
});

}

const hashed=await bcrypt.hash(password,10);

await User.create({

name,
email,
password:hashed,

role:"user"

});

res.json({
success:true,
message:"Signup successful"
});

}catch(err){

res.json({
success:false,
message:"Signup failed"
});

}

});

/* ---------------- LOGIN ---------------- */

app.post("/login", async (req,res)=>{

try{

const {email,password}=req.body;

const user=await User.findOne({email});

if(!user){

return res.json({
success:false,
message:"User not found"
});

}

const match=await bcrypt.compare(password,user.password);

if(!match){

return res.json({
success:false,
message:"Wrong password"
});

}

req.session.user=user.email;
req.session.role=user.role;

res.json({
success:true
});

}catch(err){

res.json({
success:false,
message:"Login failed"
});

}

});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// CHECK USER
app.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

/* ---------------- PAGES ---------------- */

app.get("/donors.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/donors.html"));
});

app.get("/requests.html", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/requests.html"));
});

/* ---------------- DONORS ---------------- */

// ADD DONOR (ADMIN)
app.post('/add-donor', isLoggedIn, async (req, res) => {
  try {
    req.body.bloodGroup = req.body.bloodGroup.trim().toUpperCase();
    await Donor.create(req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

// GET DONORS (ADMIN ONLY)
app.get('/donors', isLoggedIn, async (req, res) => {
  const donors = await Donor.find();
  res.json(donors);
});

// 🔥 PUBLIC BLOOD SEARCH
app.get('/search-blood', async (req, res) => {
  try {
    let blood = req.query.bloodGroup;

    if (!blood) return res.json({ available: false, count: 0 });

    blood = decodeURIComponent(blood).trim().toUpperCase();

    const donors = await Donor.find({
      $expr: {
        $eq: [
          { $toUpper: "$bloodGroup" },
          blood
        ]
      }
    });

    res.json({
      available: donors.length > 0,
      count: donors.length
    });

  } catch {
    res.status(500).json({ available: false });
  }
});

// DELETE (ADMIN)
app.delete('/delete-donor/:id', isAdmin, async (req, res) => {
  await Donor.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ---------------- REQUESTS ---------------- */

// ADD REQUEST (PUBLIC)
app.post('/add-request', async (req, res) => {
  await Request.create(req.body);
  res.json({ success: true });
});

// GET REQUESTS (ADMIN)
app.get('/requests', isLoggedIn, async (req, res) => {
  const data = await Request.find();
  res.json(data);
});

// APPROVE
app.put('/accept-request/:id', isAdmin, async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, { status: "Approved" });
  res.json({ success: true });
});

// REJECT
app.put('/reject-request/:id', isAdmin, async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, { status: "Rejected" });
  res.json({ success: true });
});

/* ---------------- SERVER ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});