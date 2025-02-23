import express from "express";
import dotenv from "dotenv";
import CryptoJS from "crypto-js";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
dotenv.config();
app.use(express.json());
app.use(cors({ origin: "*" }));

app.use(express.static("public"));

const PORT = process.env.PORT || 5000;
const AUTH_KEY = process.env.AUTH_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const API_URL = process.env.API_URL;
const USER_AGENT = process.env.USER_AGENT;

//?Shared auth function

function generateAuthHeaders() {
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = CryptoJS.SHA1(AUTH_KEY + SECRET_KEY + timestamp).toString(
    CryptoJS.enc.Hex
  );
  return {
    "User-Agent": USER_AGENT,
    "X-Auth-Key": AUTH_KEY,
    Authorization: hash,
    "X-Auth-Date": timestamp.toString(),
  };
}

app.get("/port", (req, res) => {
  res.json({ PORT });
});

app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  const headers = generateAuthHeaders();

  try {
    const response = await fetch(
      `${API_URL}/search/byterm?q=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: headers,
      }
    );

    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      const rawText = await response.text();
      res.status(500).json({ message: "Failed to get data" });
    }
  } catch (err) {
    console.log("Failed to fetch search results", err.message);
    res.status(500).json({ message: "Failed to fetch search results" });
  }
});

//?getting episodes

app.get("/api/episodes", async (req, res) => {
  const feedId = req.query.feedId;
  const max = req.query.max;
  if (!feedId) {
    return res.status(400).json({ message: "feed Id is required" });
  }

  const headers = generateAuthHeaders();
  try {
    const response = await fetch(
      `${API_URL}/episodes/byitunesid?id=${encodeURIComponent(
        feedId
      )}&max=${max}`,
      {
        method: "GET",
        headers: headers,
      }
    );
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      const rawText = await response.text();
      res.status(500).json({ message: "Failed to get data" });
    }
  } catch (err) {
    console.log("Failed to fetch search results", err.message);
    res.status(500).json({ message: "Failed to fetch search results" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
