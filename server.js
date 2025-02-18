import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

const app = express();
dotenv.config();
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", async (req, res) => {});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
