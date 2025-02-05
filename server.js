import dotenv from 'dotenv';
import express from 'express';
import mysql from 'mysql';
import bodyParser from 'body-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// **Connect to MySQL Database**
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartstudent'
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL database");
    }
});

db.query('USE smartstudent', (err) => {
    if (err) {
        console.error('Error selecting database:', err);
    } else {
        console.log('Database selected successfully');
    }
});

// **Handle Registration Form Submission**
app.post("/register", async (req, res) => {
    const { fullName, email, studentID, course, password } = req.body;

    if (!fullName || !email || !studentID || !course || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const query = "INSERT INTO users (name, email, student_ID, course_of_study, password_hash) VALUES (?, ?, ?, ?, ?)";
        db.query(query, [fullName, email, studentID, course, hashedPassword], (err, result) => {
            if (err) {
            console.error("Error inserting data:", err);
            return res.status(500).json({ error: "Server error" });
            }
            res.status(201).json({ message: "User registered successfully", userId: result.insertId });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// **Handle Login Request**
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    console.log("Login request received:", { email, password }); // Add this line for debugging

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    if (!password) {
        return res.status(400).json({ error: "Password is required" });
    }

    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json({ error: "Server error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = results[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({ message: 'Login successful', user });
    });
});

app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});