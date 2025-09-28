import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
app.use(express.json());

// serve static files (HTML, CSS, JS)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(__dirname));

// proxy endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Proxy error", details: e.message });
  }
});

app.listen(3000, () => console.log("✅ Server running at http://localhost:3000"));
