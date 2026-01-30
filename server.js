import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// Serve static files
app.use(express.static("views"));
app.use("/DB", express.static("DB"));

// Load users.json
const usersPath = path.join(process.cwd(), "users.json");
let usersData = JSON.parse(fs.readFileSync(usersPath, "utf8")).users;

// Login page
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "views", "login.html"));
});

// Handle login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = usersData.find((u) => u.username === username);
  if (!user) return res.send("Invalid username or password");

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.send("Invalid username or password");

  req.session.user = user;
  res.redirect("/dashboard");
});

// Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(process.cwd(), "views", "dashboard.html"));
});

// API to load CSV for logged‑in user
app.get("/api/data", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });

  const clientFolder = req.session.user.clientFolder;
  const csvPath = path.join(process.cwd(), "DB", clientFolder, "SalesDB.csv");

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: "CSV file not found" });
  }

  const results = [];

  fs.createReadStream(csvPath)
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (row) => results.push(row))
    .on("end", () => res.json(results))
    .on("error", (err) => res.status(500).json({ error: err.message }));
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});