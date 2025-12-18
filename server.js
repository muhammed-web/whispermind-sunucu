const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// 1. TEŞHİS ROTASI: Modelleri Listele
// Tarayıcıdan https://whispermind-sunucu.onrender.com/test adresine girince çalışır
app.get("/test", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.send("API Anahtarı Yok!");

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data); // Google'ın gördüğü tüm modelleri ekrana basar
    } catch (error) {
        res.json({ error: error.message });
    }
});

// 2. ANA ROTA: Ses Özeti
app.post("/summarize", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ summary: "Hata: Dosya yok." });
    
    console.log("📩 Dosya geldi:", req.file.size);
    const apiKey = process.env.GEMINI_API_KEY;
    const base64Data = req.file.buffer.toString("base64");

    // MODELİ DEĞİŞTİRİYORUZ: 'gemini-1.5-flash' yerine 'gemini-1.5-flash-latest' deniyoruz
    // Bazen Google versiyon isimlendirmesini değiştiriyor.
    const modelName = "gemini-1.5-flash-latest"; 
    
    console.log(`🚀 ${modelName} modeline bağlanılıyor...`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
              text: "Bu ses kaydını dinle ve Türkçe özetle."
            }, {
              inlineData: {
                mimeType: "audio/mp3",
                data: base64Data
              }
            }]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Google Hatası:", data.error);
      // Hata varsa kullanıcıya hatayı olduğu gibi gösterelim
      return res.status(500).json({ summary: `Google Hatası: ${data.error.message}` });
    }

    const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ summary: summaryText || "Özet boş geldi." });

  } catch (error) {
    console.error("Sunucu Hatası:", error);
    res.status(500).json({ summary: `Sunucu Hatası: ${error.message}` });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu Hazır: http://localhost:${PORT}`);
});
