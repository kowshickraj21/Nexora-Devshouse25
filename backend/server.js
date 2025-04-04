require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());
app.use(cors());

app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const result = await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
            [username, email, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(400).json({ error: "User not found" });

        const isValid = await bcrypt.compare(password, user.rows[0].password);
        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000);
