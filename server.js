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

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB Connected ✔"))
    .catch(err => console.log("DB Connection Error:", err));

app.set("trust proxy", 1);
app.use(session({
    secret: "bloodbank_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

/* --- AUTH ROUTES --- */
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        // QUERYING THE EXACT "Email Address" FIELD FROM YOUR ATLAS SCREENSHOT
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

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login.html"));
});

/* --- DATA API --- */
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));