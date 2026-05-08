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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// DB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB Connected ✔"))
    .catch(err => console.log("DB Error:", err));

// Session Fix for Render
app.set("trust proxy", 1);
app.use(session({
    secret: "bloodbank_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { 
        secure: process.env.NODE_ENV === "production", 
        sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 
    }
}));

/* --- DATA API ROUTES --- */
app.get("/donors-list", async (req, res) => {
    try {
        const data = await Donor.find();
        res.status(200).json(data);
    } catch (err) { res.status(500).json([]); }
});

app.get("/donors-count", async (req, res) => {
    try {
        const d = await Donor.find();
        res.json({
            Apos: d.filter(x => x.bloodGroup === "A+").length,
            Bpos: d.filter(x => x.bloodGroup === "B+").length,
            Opos: d.filter(x => x.bloodGroup === "O+").length,
            ABpos: d.filter(x => x.bloodGroup === "AB+").length
        });
    } catch (err) { res.json({ Apos:0, Bpos:0, Opos:0, ABpos:0 }); }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) {
        req.session.user = user.email;
        req.session.role = user.role;
        return res.json({ success: true });
    }
    res.json({ success: false });
});

// Serve the index.html for the root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));