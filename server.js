const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- SESSION ----------------
app.use(session({
  secret: "bloodbank_secret_key",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: "mongodb://himubhatt2305_db_user:Anshika639512@ac-jy1kdf7-shard-00-00.tpfnrr1.mongodb.net:27017,ac-jy1kdf7-shard-00-01.tpfnrr1.mongodb.net:27017,ac-jy1kdf7-shard-00-02.tpfnrr1.mongodb.net:27017/bloodbank?ssl=true&replicaSet=atlas-2pavzb-shard-0&authSource=admin&retryWrites=true&w=majority"
  })
}));

// ---------------- MONGODB CONNECT ----------------
mongoose.connect("mongodb://himubhatt2305_db_user:Anshika639512@ac-jy1kdf7-shard-00-00.tpfnrr1.mongodb.net:27017,ac-jy1kdf7-shard-00-01.tpfnrr1.mongodb.net:27017,ac-jy1kdf7-shard-00-02.tpfnrr1.mongodb.net:27017/bloodbank?ssl=true&replicaSet=atlas-2pavzb-shard-0&authSource=admin&retryWrites=true&w=majority")
.then(() => console.log("DB Connected ✔"))
.catch(err => console.log("DB Error:", err));

// ---------------- MODELS ----------------
const Donor = require('./models/donors');
const Request = require('./models/request');

// ---------------- HOME ----------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ---------------- LOGIN ----------------
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    req.session.user = username;
    return res.redirect("/donors.html");
  }

  res.send("Invalid credentials");
});

// ---------------- LOGOUT ----------------
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ---------------- AUTH ----------------
function isLoggedIn(req, res, next) {
  if (req.session.user) next();
  else res.redirect("/login");
}

// ---------------- PROTECTED PAGE ----------------
app.get("/donors.html", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "public/donors.html"));
});

// ---------------- DONOR APIs ----------------
app.post('/add-donor', async (req, res) => {
  try {
    const donor = new Donor(req.body);
    await donor.save();
    res.send("Donor Saved ✅");
  } catch (err) {
    res.status(500).send("Error saving donor");
  }
});

app.get('/donors', async (req, res) => {
  const donors = await Donor.find();
  res.json(donors);
});

app.get('/search', async (req, res) => {
  let bg = req.query.bloodGroup;

  if (!bg) return res.json([]);

  bg = decodeURIComponent(bg).trim().toUpperCase();

  const donors = await Donor.find({ bloodGroup: bg });
  res.json(donors);
});

app.put('/update-donor/:id', async (req, res) => {
  await Donor.findByIdAndUpdate(req.params.id, req.body);
  res.send("Donor Updated ✅");
});

app.delete('/delete-donor/:id', async (req, res) => {
  await Donor.findByIdAndDelete(req.params.id);
  res.send("Donor Deleted ✅");
});

// ---------------- REQUEST APIs ----------------
app.post('/request-blood', async (req, res) => {
  try {
    const request = new Request(req.body);
    await request.save();
    res.send("Request Saved Successfully ✅");
  } catch (err) {
    res.status(500).send("Error saving request");
  }
});

app.get('/requests', async (req, res) => {
  try {
    const data = await Request.find();
    res.json(data);
  } catch (err) {
    res.status(500).send("Error fetching requests");
  }
});

app.put('/accept-request/:id', async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, {
    status: "Approved"
  });
  res.send("Request Approved ✅");
});

app.put('/reject-request/:id', async (req, res) => {
  await Request.findByIdAndUpdate(req.params.id, {
    status: "Rejected"
  });
  res.send("Request Rejected ❌");
});

// ---------------- SERVER ----------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
