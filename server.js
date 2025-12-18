const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());

// Dosyaları hafızada tut
const upload = multer({ storage: multer.memoryStorage() });

// 1. TEŞHİS ROTASI (Test için kalsın, zararı yok)
app.get("/test", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.json({ error: error.message });
    }
});

// 2. ANA ROTA: Ses Özeti
app.post("/summarize", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ summary: "Hata: Dosya yok." });
    
    console.log("📩 Dosya geldi! Boyut:", req.file.size);
    const apiKey = process.env.GEMINI_API_KEY;
    const base64Data = req.file.buffer.toString("base64");

    // İŞTE ÇÖZÜM BURADA: Listende var olan modeli seçtik!
    const modelName = "gemini-flash-latest"; 
    
    console.log(`🚀 ${modelName} modeline bağlanılıyor...`);

    // Kütüphanesiz, direkt istek (En garantisi)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
              text: "Bu ses kaydını dinle ve konuşulanları Türkçe olarak detaylıca özetle."
            }, {
              inlineData: {
                // Telefondan bazen octet-stream geliyor, mp3 varsayıyoruz
                mimeType: "audio/mp3", 
                data: base64Data
              }
            }]
        }]
      })
    });

    const data = await response.json();

    // Hata kontrolü
    if (data.error) {
      console.error("Google Hatası:", JSON.stringify(data.error, null, 2));
      return res.status(500).json({ summary: `Google Hatası: ${data.error.message}` });
    }

    // Cevabı al
    const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (summaryText) {
      console.log("✅ Özet başarıyla alındı!");
      res.json({ summary: summaryText });
    } else {
      console.log("⚠️ Cevap boş geldi:", data);
      res.json({ summary: "Özet oluşturulamadı, ses anlaşılamadı." });
    }

  } catch (error) {
    console.error("Sunucu Hatası:", error);
    res.status(500).json({ summary: `Sunucu Hatası: ${error.message}` });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu Hazır: http://localhost:${PORT}`);
});

