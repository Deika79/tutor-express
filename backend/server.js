import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import ffmpeg from "fluent-ffmpeg";
import nodemailer from "nodemailer";
ffmpeg.setFfmpegPath("C:\\Users\\Gaylo Follen\\Downloads\\ffmpeg-8.1-essentials_build\\ffmpeg-8.1-essentials_build\\bin\\ffmpeg.exe");
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// carpeta temporal
const upload = multer({ dest: "uploads/" });

// cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// test
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

// 🔥 SUBIDA + CONVERSIÓN + TRANSCRIPCIÓN + GPT + TXT
app.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió archivo" });
    }

    const inputPath = req.file.path;
    const outputPath = inputPath + ".wav";

    console.log("Archivo recibido:", req.file.originalname);
    console.log("MIME TYPE:", req.file.mimetype);

    // 🎙️ CONVERSIÓN A WAV (CLAVE)
    console.log("Convirtiendo audio a WAV...");

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    console.log("Audio convertido");

    // 🔊 TRANSCRIPCIÓN (SIEMPRE WAV)
    const file = await toFile(
      fs.createReadStream(outputPath),
      "audio.wav",
      { type: "audio/wav" }
    );

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe"
    });

    const texto = transcription.text;

    console.log("Texto:", texto);

    // 🧠 PROMPT
    const prompt = `
Eres un asistente experto en documentación educativa en España.

A partir de la siguiente transcripción de una tutoría entre docente y familia, genera un informe claro, profesional y listo para uso interno.

REQUISITOS:
- Español formal pero cercano
- Máximo 200 palabras
- Sin repeticiones
- No inventar información
- Si algún apartado no tiene información suficiente, déjalo vacío (sin rellenar)

FORMATO EXACTO:

Desarrollo de la tutoría:
[Texto]

Conclusiones y acuerdos:
[Texto]

TRANSCRIPCIÓN:
${texto}
`;

    console.log("Generando informe...");

    // 🤖 GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const resumen = completion.choices[0].message.content;

    // 📄 GENERAR TXT
    const fileName = `tutoria-${Date.now()}.txt`;
    const fileFullPath = path.join("uploads", fileName);

    fs.writeFileSync(fileFullPath, resumen, "utf8");

    // limpiar archivos
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    // 📩 enviar archivo
    res.download(fileFullPath, fileName, () => {
      fs.unlinkSync(fileFullPath);
    });

  } catch (error) {
    console.error("ERROR COMPLETO:", error);

    res.status(500).json({
      error: "Error procesando tutoría",
      detalle: error.message
    });
  }
});

// 📩 ENVIAR EMAIL
app.post("/send-email", async (req, res) => {
  try {
    const { email, contenido } = req.body;

    if (!email || !contenido) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Tutoría generada",
      text: contenido,
    };

    await transporter.sendMail(mailOptions);

    res.json({ mensaje: "Email enviado correctamente" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error enviando email" });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
});