require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { ObjectId } = require("mongodb");

const app = express();

/* ---------------- MIDDLEWARE ---------------- */

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(express.static(
    path.join(__dirname, "public")
));

/* ---------------- DATABASE ---------------- */

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB Connected ✔"))
.catch(err => console.log(err));

/* ---------------- SESSION ---------------- */

app.set("trust proxy", 1);

app.use(session({

    secret: "bloodbank_secret_key",

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI
    }),

    cookie: {

        secure: true,

        sameSite: "none",

        maxAge: 1000 * 60 * 60 * 24
    }

}));

/* ---------------- HOME ---------------- */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public/index.html")
    );

});

/* ---------------- LOGIN ---------------- */

app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    try {

        const user = await mongoose.connection.db
        .collection("users")
        .findOne({

            "Email Address": username,
            password: password

        });

        if (!user) {

            return res.json({

                success: false,
                message: "Invalid Credentials"

            });

        }

        req.session.user = user["Email Address"];

        req.session.role = user.role;

        res.json({

            success: true,
            role: user.role

        });

    } catch (err) {

        res.json({
            success: false
        });

    }

});

/* ---------------- DONORS LIST ---------------- */

app.get("/donors-list", async (req, res) => {

    try {

        const data = await mongoose.connection.db
        .collection("donors")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

        res.json(data);

    } catch (err) {

        res.json([]);

    }

});

/* ---------------- ADD DONOR ---------------- */

app.post("/add-donor", async (req, res) => {

    try {

        await mongoose.connection.db
        .collection("donors")
        .insertOne({

            ...req.body,

            createdAt: new Date()

        });

        res.json({
            success: true
        });

    } catch (err) {

        res.json({
            success: false
        });

    }

});

/* ---------------- DELETE DONOR ---------------- */

app.delete("/delete-donor/:id", async (req, res) => {

    try {

        const donorId = new ObjectId(req.params.id);

        await mongoose.connection.db
        .collection("donors")
        .deleteOne({

            _id: donorId

        });

        res.json({
            success: true
        });

    } catch (err) {

        res.json({
            success: false
        });

    }

});

/* ---------------- REQUESTS DATA ---------------- */

app.get("/requests-data", async (req, res) => {

    try {

        const data = await mongoose.connection.db
        .collection("requests")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

        res.json(data);

    } catch (err) {

        res.json([]);

    }

});

/* ---------------- ADD REQUEST ---------------- */

app.post("/add-request", async (req, res) => {

    try {

        await mongoose.connection.db
        .collection("requests")
        .insertOne({

            ...req.body,

            status: "Pending",

            createdAt: new Date()

        });

        res.json({
            success: true
        });

    } catch (err) {

        res.json({
            success: false
        });

    }

});

/* ---------------- UPDATE REQUEST STATUS ---------------- */

app.post("/update-request-status/:id", async (req, res) => {

    try {

        const requestId = new ObjectId(req.params.id);

        const { status } = req.body;

        await mongoose.connection.db
        .collection("requests")
        .updateOne(

            {
                _id: requestId
            },

            {
                $set: {
                    status: status
                }
            }

        );

        res.json({
            success: true
        });

    } catch (err) {

        res.json({
            success: false
        });

    }

});

/* ---------------- DASHBOARD STATS ---------------- */

app.get("/dashboard-stats", async (req, res) => {

    try {

        const donors = await mongoose.connection.db
        .collection("donors")
        .find({})
        .toArray();

        res.json({

            total: donors.length,

            Apos: donors.filter(
                d => d.bloodGroup === "A+"
            ).length,

            Bpos: donors.filter(
                d => d.bloodGroup === "B+"
            ).length,

            Opos: donors.filter(
                d => d.bloodGroup === "O+"
            ).length,

            ABpos: donors.filter(
                d => d.bloodGroup === "AB+"
            ).length

        });

    } catch (err) {

        res.json({

            total: 0,
            Apos: 0,
            Bpos: 0,
            Opos: 0,
            ABpos: 0

        });

    }

});

/* ---------------- LOGOUT ---------------- */

app.get("/logout", (req, res) => {

    req.session.destroy(() => {

        res.redirect("/login.html");

    });

});

/* ---------------- SERVER ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`Server Live on ${PORT}`);

});