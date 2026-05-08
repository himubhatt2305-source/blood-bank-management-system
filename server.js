require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected ✔"));

// 2. Session Setup
app.set("trust proxy", 1);
app.use(session({
    secret: "bloodbank_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { 
        secure: true, // Secure must be true because your screenshots show you are on HTTPS
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24 
    }
}));

// 3. THE DIRECT LOGIN FIX
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        // We query the "users" collection directly to match the "Email Address" field exactly
        const user = await mongoose.connection.db.collection("users").findOne({ 
            "Email Address": username, 
            "password": password 
        });

        if (user) {
            req.session.user = user["Email Address"];
            req.session.role = user.role;
            return res.json({ success: true, role: user.role });
        }
        res.json({ success: false, message: "Invalid email or password" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 4. THE DIRECT DATA FIX
app.get("/donors-list", async (req, res) => {
    try {
        const data = await mongoose.connection.db.collection("donors").find({}).toArray();
        res.json(data);
    } catch (err) {
        res.json([]);
    }
});

app.get("/donors-count", async (req, res) => {
    try {
        const d = await mongoose.connection.db.collection("donors").find({}).toArray();
        res.json({
            Apos: d.filter(x => x.bloodGroup === "A+").length,
            Bpos: d.filter(x => x.bloodGroup === "B+").length,
            Opos: d.filter(x => x.bloodGroup === "O+").length,
            ABpos: d.filter(x => x.bloodGroup === "AB+").length
        });
    } catch (err) {
        res.json({ Apos: 0, Bpos: 0, Opos: 0, ABpos: 0 });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Live"));