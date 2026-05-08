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
        secure: true, // true for Render/HTTPS
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24 
    }
}));

/* --- THE DIRECT FIX: LOGIN BYPASSING MODELS --- */
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        // We talk directly to the 'users' collection 
        // to find the exact "Email Address" field name from your Atlas screen
        const user = await mongoose.connection.db.collection("users").findOne({ 
            "Email Address": username, 
            "password": password 
        });

        if (user) {
            req.session.user = user["Email Address"];
            req.session.role = user.role;
            return res.json({ success: true, role: user.role });
        } else {
            res.json({ success: false, message: "Invalid email or password" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

/* --- DATA API --- */
app.get("/donors-list", async (req, res) => {
    try {
        const data = await mongoose.connection.db.collection("donors").find({}).toArray();
        res.json(data);
    } catch (err) { res.json([]); }
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
    } catch (err) { res.json({ Apos:0, Bpos:0, Opos:0, ABpos:0 }); }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Live`));