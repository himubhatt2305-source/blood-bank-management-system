require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { ObjectId } = require("mongodb");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected ✔"));

app.set("trust proxy", 1);
app.use(session({
    secret: "bloodbank_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { secure: true, sameSite: 'none', maxAge: 1000 * 60 * 60 * 24 }
}));

/* --- AUTH --- */
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await mongoose.connection.db.collection("users").findOne({ "Email Address": username, password });
        if (user) {
            req.session.user = user["Email Address"];
            req.session.role = user.role;
            return res.json({ success: true, role: user.role });
        }
        res.json({ success: false, message: "Invalid credentials" });
    } catch (err) { res.status(500).json({ success: false }); }
});

/* --- DONORS (Edit/Delete/List) --- */
app.get("/donors-list", async (req, res) => {
    const data = await mongoose.connection.db.collection("donors").find({}).toArray();
    res.json(data);
});

app.post("/add-donor", async (req, res) => {
    try {
        await mongoose.connection.db.collection("donors").insertOne({...req.body, createdAt: new Date()});
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

app.delete("/delete-donor/:id", async (req, res) => {
    try {
        await mongoose.connection.db.collection("donors").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

/* --- REQUESTS (Status Update) --- */
app.get("/requests-data", async (req, res) => {
    const data = await mongoose.connection.db.collection("requests").find({}).toArray();
    res.json(data);
});

app.post("/add-request", async (req, res) => {
    try {
        await mongoose.connection.db.collection("requests").insertOne({...req.body, status: "Pending", createdAt: new Date()});
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

app.post("/update-request-status/:id", async (req, res) => {
    try {
        const { status } = req.body;
        await mongoose.connection.db.collection("requests").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status } }
        );
        res.json({ success: true });
    } catch (err) { res.json({ success: false }); }
});

/* --- DASHBOARD STATS --- */
app.get("/dashboard-stats", async (req, res) => {
    const d = await mongoose.connection.db.collection("donors").find({}).toArray();
    res.json({
        total: d.length,
        Apos: d.filter(x => x.bloodGroup === "A+").length,
        Bpos: d.filter(x => x.bloodGroup === "B+").length,
        Opos: d.filter(x => x.bloodGroup === "O+").length,
        ABpos: d.filter(x => x.bloodGroup === "AB+").length
    });
});

app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/login.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server Live`));