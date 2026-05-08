require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const User = require("./models/User");
const Donor = require("./models/donors");
const Request = require("./models/request");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB Connected ✔"))
    .catch(err => console.log("DB Connection Error:", err));

// Session Setup
app.set("trust proxy", 1);
app.use(session({
    secret: "bloodbank_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        secure: false, // Set to true only if using HTTPS on Render
        maxAge: 1000 * 60 * 60 * 24
    }
}));

/* --- PAGE ROUTES --- */
app.get("/donors", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "donors.html"));
});

app.get("/request", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "request.html"));
});

/* --- AUTH ROUTES --- */
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        // Correctly matches the spaced field name in your Atlas database
        const user = await User.findOne({ "Email Address": username, password: password });

        if (user) {
            req.session.user = user["Email Address"];
            req.session.role = user.role;
            res.json({ success: true, role: user.role });
        } else {
            res.json({ success: false, message: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exist = await User.findOne({ "Email Address": email });
        if (exist) return res.json({ success: false, message: "User already exists" });

        // FIXED: Must use "Email Address" as the key to match your database structure
        await User.create({ 
            "Email Address": email, 
            password: password, 
            role: "user" 
        });
        
        res.json({ success: true, message: "Signup successful!" });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Signup failed" });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login.html"));
});

/* --- DATA API --- */
app.post("/add-donor", async (req, res) => {
    try {
        await Donor.create(req.body);
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

app.get("/donors-list", async (req, res) => {
    const data = await Donor.find();
    res.json(data);
});

app.get("/donors-count", async (req, res) => {
    const d = await Donor.find();
    res.json({
        Apos: d.filter(x => x.bloodGroup === "A+").length,
        Bpos: d.filter(x => x.bloodGroup === "B+").length,
        Opos: d.filter(x => x.bloodGroup === "O+").length,
        ABpos: d.filter(x => x.bloodGroup === "AB+").length
    });
});

app.get("/requests-data", async (req, res) => {
    try {
        const data = await Request.find();
        res.json(data);
    } catch (err) { res.status(500).json([]); }
});

app.post("/add-request", async (req, res) => {
    try {
        await Request.create({ ...req.body, status: "Pending" });
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));