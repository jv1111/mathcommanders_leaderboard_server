const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Console } = require("console");

const app = express();
const PORT = 8080;

// Parse form fields (for custom filename)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

app.post("/saveNewData", (req, res) => {
  const newEntry = req.body;
  console.log("[Server] Received new leaderboard entry:", newEntry);
  const filePath = path.join(__dirname, "uploads", "leaderboard_data.txt");

  let data = { entries: [] };

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf8");
    data = JSON.parse(raw);
  }

  const index = data.entries.findIndex(e => e.name === newEntry.name);

  if (index !== -1) {
    if (newEntry.score > data.entries[index].score) {
      data.entries[index] = newEntry;
    }
  } else {
    data.entries.push(newEntry);
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log("[Server] Updated leaderboard:", data);

  res.json(data);
});


// Download route
app.post("/download", (req, res) => {
  const { filename, hasData, currentContent } = req.body;

  const filePath = path.join(__dirname, "uploads", filename);

  if (fs.existsSync(filePath)) {
    try {
      const contentRaw = fs.readFileSync(filePath, "utf8");
      const existingData = JSON.parse(contentRaw); // parse existing JSON
      console.log(`[Server] data found sending back: ${contentRaw}`);

      if (hasData && currentContent && currentContent.entries) {
        currentContent.entries.forEach(newEntry => {
          const index = existingData.entries.findIndex(e => e.name === newEntry.name);
          if (index !== -1) {
            // Replace existing entry only if the new score is higher
            if (newEntry.score > existingData.entries[index].score) {
              console.log(`[Server] Updating score for ${newEntry.name}: ${existingData.entries[index].score} → ${newEntry.score}`);
              existingData.entries[index] = newEntry;
            }
          } else {
            // Append new entry if not found
            console.log(`[Server] Adding new entry for ${newEntry.name} with score ${newEntry.score}`);
            existingData.entries.push(newEntry);
          }
        });

        // Save updated file
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), "utf8");
        console.log(`[Server] Updated file with new/modified entries: ${filePath}`);
      }

      res.json({ content: JSON.stringify(existingData) });
    } catch (err) {
      res.status(500).json({ error: "Failed to read file" });
    }
  } else {
    if (hasData) {
      return saveNewFile(filePath, currentContent, res);
    }else{
      console.log("[Server] No data found, file does not exist:");
      return res.status(404).json({ error: "Fresh data: file not found" });
    }
  }
});

function saveNewFile(filePath, content, res) {
  try {
    const contentToSave = JSON.stringify(content, null, 2);
    fs.writeFileSync(filePath, contentToSave, "utf8");
    console.log(`[Server] File created: ${filePath}`);
    return res.status(404).json({ error: "File not found, creating a new one" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save new file" });
  }
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
