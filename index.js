const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Console } = require("console");

const app = express();
const PORT = 8080;

// Parse form fields (for custom filename)
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Configure storage for multer with custom filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Use the name from the body, fallback to original name
    const customName = req.body.filename || file.originalname;
    cb(null, customName); // do not modify the name at all
  }
});

const upload = multer({ storage });

// Serve your HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Handle file upload
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("File uploaded:", req.file);
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  res.send("File uploaded successfully: " + req.file.filename);
});

// Download route
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8"); // read text file
      res.json({ content }); // return as JSON
    } catch (err) {
      res.status(500).json({ error: "Failed to read file" });
    }
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
