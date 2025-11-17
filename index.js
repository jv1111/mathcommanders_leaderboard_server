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
  res.send("server is running");
});

// Handle file upload
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("File uploaded:", req.file);
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  res.send("File uploaded successfully: " + req.file.filename);
});

// Clear all uploaded files
app.get("/clear", (req, res) => {
  const folder = path.join(__dirname, "uploads");

  if (!fs.existsSync(folder)) {
    return res.status(404).send("Uploads folder does not exist.");
  }

  fs.readdir(folder, (err, files) => {
    if (err) return res.status(500).send("Failed to read uploads folder.");

    files.forEach(file => {
      const filePath = path.join(folder, file);
      fs.unlink(filePath, err => {
        if (err) console.error("Failed to delete file:", filePath, err);
      });
    });

    res.send("All uploaded files have been cleared.");
  });
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
