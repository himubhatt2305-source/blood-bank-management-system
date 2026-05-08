require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo"); // Fixed import for v4+

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// DB Connection
mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected ✔"));

// Session Setup - Bulletproof version
app.set("trust proxy", 1);
app.use(session({
    secret: "bloodbank_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { secure: true, sameSite: 'none', maxAge: 1000 * 60 * 60 * 24 }
}));

// LOGIN: Direct query with spaced field name
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
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
    } catch (err) { res.status(500).json({ success: false }); }
});

// DONATE: Adding default timestamp
app.post("/add-donor", async (req, res) => {
    try {
        await mongoose.connection.db.collection("donors").insertOne({
            ...req.body,
            createdAt: new Date() // Default value
        });
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

// REQUEST: Adding default status "Pending"
app.post("/add-request", async (req, res) => {
    try {
        await mongoose.connection.db.collection("requests").insertOne({
            ...req.body,
            status: "Pending", // Default value
            createdAt: new Date() // Default value
        });
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

app.get("/donors-list", async (req, res) => {
    const data = await mongoose.connection.db.collection("donors").find({}).toArray();
    res.json(data);
});

app.get("/requests-data", async (req, res) => {
    const data = await mongoose.connection.db.collection("requests").find({}).toArray();
    res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Live`));