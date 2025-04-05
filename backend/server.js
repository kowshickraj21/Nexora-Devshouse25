require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const gTTS = require("gtts");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

const app = express();
const pool = new Pool({ connectionString: process.env.DB_URL });
ffmpeg.setFfmpegPath(ffmpegPath);

app.use(express.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await pool.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
            [name, email, hashedPassword]
        );
        res.status(201).send("User created");
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(400).json({ error: "User not found" });

        const isValid = await bcrypt.compare(password, user.rows[0].password);
        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function transcribe(audioBuffer) {
    const filename = `recording-${uuidv4()}.wav`;
    const filePath = path.join(__dirname, filename);

    fs.writeFileSync(filePath, audioBuffer);

    const whisperCommand = `whisper --model base --language en --task transcribe ${filePath}`;

    return new Promise((resolve, reject) => {
        exec(whisperCommand, (error, stdout, stderr) => {
            if (error) {
                console.error("Whisper error:", stderr);
                return reject("Whisper transcription failed.");
            }

            const transcriptPath = filePath.replace(".wav", ".txt");

            fs.readFile(transcriptPath, "utf8", (err, data) => {
                if (err) {
                    return reject("Failed to read transcript.");
                }

                fs.unlinkSync(filePath);
                fs.unlinkSync(transcriptPath);

                resolve(data.trim());
            });
        });
    });
}

app.post("/voice-assistant", upload.single("audio"), async (req, res) => {

    try {
        if (!req.file || !req.file.buffer) {
            console.log("File doesnt exist")
          }
      const userText = await transcribe(req.file.buffer);
      console.log("Transcribed Text:", userText);


    const response = await axios.post(
        "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1",
        { inputs: userText },
        {
            headers: {
                "Authorization": `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
            }
        }
    );
    const text = response.data[0].generated_text
    console.log(text);

    const gtts = new gTTS(text, "en");
    const mp3Path = path.join(__dirname, "temp.mp3");
    const wavPath = path.join(__dirname, "output.wav");
  
    gtts.save(mp3Path, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to convert text to speech" });
      }
  
      ffmpeg(mp3Path)
      .toFormat("wav")
      .on("end", () => {
        res.sendFile(wavPath, () => {
          fs.unlinkSync(mp3Path);
          fs.unlinkSync(wavPath);
        });
      })
      .on("error", (err) => {
        console.error(err);
        res.status(500).json({ error: "Failed to convert to WAV" });
      })
      .save(wavPath);

    });

    } catch (err) {
      console.error("Voice Assistant Error:", err?.response?.data || err.message);
      res.status(500).json({ error: "Something went wrong" });
    }

});

app.listen(3000);
