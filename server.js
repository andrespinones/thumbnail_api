import express from "express";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(cors()); // allow Bubble to call it
app.use("/public", express.static(path.join(process.cwd(), "public")));

// ensure public dir exists
if (!fs.existsSync("./public")) fs.mkdirSync("./public");

app.post("/thumbnail", async (req, res) => {
  const { url, time = 10 } = req.body;
  if (!url) return res.status(400).json({ error: "Missing video URL" });

  const filename = `thumb_${Date.now()}.jpg`;
  const outPath = path.join("public", filename);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(url)
        .on("end", resolve)
        .on("error", reject)
        .screenshots({
          timestamps: [String(time)],
          filename,
          folder: "./public",
          size: "480x?"
        });
    });

    // Build public URL (Railway will give you the base domain)
    const base = process.env.BASE_URL || ""; // set on Railway (see deploy steps)
    const publicUrl = base ? `${base}/public/${filename}` : `/public/${filename}`;

    // Return the direct URL
    res.json({ thumbnail_url: publicUrl, filename });
  } catch (err) {
    console.error("thumbnail error:", err);
    // Cleanup if file exists
    fs.existsSync(outPath) && fs.unlinkSync(outPath);
    res.status(500).json({ error: "Failed to generate thumbnail", details: err.message });
  }
});

// health
app.get("/", (req, res) => res.send("thumbnail api ok"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
