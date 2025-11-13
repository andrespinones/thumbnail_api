const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const ffmpeg = require("fluent-ffmpeg");
const os = require("os");
const path = require("path");

const app = express();
app.use(express.json());

app.post("/thumbnail", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing video URL" });

  const tempVideoPath = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);
  const tempThumbPath = path.join(os.tmpdir(), `thumb-${Date.now()}.jpg`);

  try {
    // Stream-download the video file
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);

    const fileStream = fs.createWriteStream(tempVideoPath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    // Generate thumbnail
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .on("end", resolve)
        .on("error", reject)
        .screenshots({
          count: 1,
          filename: path.basename(tempThumbPath),
          folder: path.dirname(tempThumbPath),
          size: "320x240",
        });
    });

    const thumbnailBase64 = fs.readFileSync(tempThumbPath).toString("base64");

    // Clean up
    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(tempThumbPath);

    res.json({ thumbnail: `data:image/jpeg;base64,${thumbnailBase64}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate thumbnail", details: err.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
