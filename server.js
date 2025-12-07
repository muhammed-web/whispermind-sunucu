const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());

// Dosyaları geçici hafızada tut
const upload = multer({ storage: multer.memoryStorage() });

// Google AI Bağlantısı
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/summarize", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ summary: "Hata: Ses dosyası sunucuya ulaşmadı." });
    }

    console.log("📩 Ses dosyası alındı! Boyut:", req.file.size, "byte");

    // Modeli seç (Gemini 2.0 Flash)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // DİKKAT: Flutter'dan gelen ses bazen isimsiz oluyor.
    // Google'ın anlaması için "audio/mp4" olduğunu elle belirtiyoruz.
    const audioData = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: "audio/mp4",
      },
    };

    console.log("🤖 Google Yapay Zekaya gönderiliyor...");

    // İsteği gönder
    const prompt =
      "Bu ses kaydını dinle. Konuşulanları Türkçe olarak özetle. Eğer ses boşsa veya gürültü varsa bunu belirt.";
    const result = await model.generateContent([prompt, audioData]);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Özet başarıyla oluşturuldu!");
    res.json({ summary: text });
  } catch (error) {
    // Hata olursa konsola detaylı yaz
    console.error("❌ HATA OLUŞTU:", error);

    // Hatayı telefona da gönder ki görelim
    res.status(500).json({
      summary: `Sunucu Hatası Oluştu:\n${error.message || error}`,
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mutfak (Sunucu) Hazır: http://localhost:${PORT}`);
});

