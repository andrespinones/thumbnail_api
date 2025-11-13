import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import { fileURLToPath } from "url";
import path from "path";
import os from "os";

const app = express();
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.post("/thumbnail", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing video URL" });

  try {
    // Download video to a temp file
    const tempVideoPath = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.status}`);
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempVideoPath, Buffer.from(buffer));

    // Generate thumbnail
    const tempThumbnailPath = path.join(os.tmpdir(), `thumb-${Date.now()}.jpg`);
    await new Promise((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .on("end", resolve)
        .on("error", reject)
        .screenshots({
          count: 1,
          filename: path.basename(tempThumbnailPath),
          folder: path.dirname(tempThumbnailPath),
          size: "320x240",
        });
    });

    // Read thumbnail and encode to base64
    const thumbnailBase64 = fs.readFileSync(tempThumbnailPath).toString("base64");

    // Clean up temp files
    fs.unlinkSync(tempVideoPath);
    fs.unlinkSync(tempThumbnailPath);

    res.json({ thumbnail: `data:image/jpeg;base64,${thumbnailBase64}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate thumbnail", details: err.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));
