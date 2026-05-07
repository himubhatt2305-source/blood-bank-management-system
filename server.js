require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Donor = require("./models/donors");
const Request = require("./models/request");

const app = express();

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- DB ---------------- */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("DB Connected ✔"))
.catch(err=>console.log(err));

/* ---------------- SESSION ---------------- */
app.use(session({
  secret: "bloodbank_secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

/* ---------------- ROUTES ---------------- */

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public/index.html"));
});

/* ---------------- SIGNUP ---------------- */
app.post("/signup", async (req,res)=>{
  const {name,email,password}=req.body;

  const exist = await User.findOne({email});
  if(exist) return res.json({success:false,message:"User exists"});

  const hashed = await bcrypt.hash(password,10);

  await User.create({name,email,password:hashed,role:"user"});

  res.json({success:true});
});

/* ---------------- LOGIN ---------------- */
app.post("/login", async (req,res)=>{
  const {email,password}=req.body;

  const user = await User.findOne({email});

  if(!user) return res.json({success:false,message:"User not found"});

  const match = await bcrypt.compare(password,user.password);

  if(!match) return res.json({success:false,message:"Wrong password"});

  req.session.user=user.email;
  req.session.role=user.role;

  res.json({success:true});
});

/* ---------------- SUMMARY ---------------- */
app.get("/donors", async (req,res)=>{
  const donors = await Donor.find();

  res.json({
    total: donors.length,
    Apos: donors.filter(d=>d.bloodGroup==="A+").length,
    Bpos: donors.filter(d=>d.bloodGroup==="B+").length,
    Opos: donors.filter(d=>d.bloodGroup==="O+").length,
    ABpos: donors.filter(d=>d.bloodGroup==="AB+").length
  });
});

app.get("/requests", async (req,res)=>{
  const count = await Request.countDocuments();
  res.json({count});
});

app.listen(3000,()=>console.log("Server running ✔"));