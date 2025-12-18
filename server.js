const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());

// Dosyaları hafızada tut
const upload = multer({ storage: multer.memoryStorage() });

app.post("/summarize", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ summary: "Hata: Dosya yok." });
    }

    console.log("📩 Dosya alındı! Boyut:", req.file.size);

    // API Anahtarını kontrol et
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Anahtarı bulunamadı (Environment Variable eksik).");
    }

    // Dosyayı Base64 formatına çevir
    const base64Data = req.file.buffer.toString("base64");
    
    // Ses dosyası (MP3) varsayıyoruz
    const mimeType = "audio/mp3";

    console.log("🚀 Google'a direkt bağlanılıyor...");

    // Kütüphane YOK! Direkt Google adresine istek atıyoruz.
    // Modeli 1.5 Flash seçtik.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Bu ses kaydını dinle ve konuşulanları Türkçe olarak detaylıca özetle." },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();

    // Google hata mesajı döndürdüyse yakalayalım
    if (data.error) {
      console.error("Google Hatası:", JSON.stringify(data.error, null, 2));
      return res.status(500).json({ 
        summary: `Google Hatası: ${data.error.message}` 
      });
    }

    // Cevabı al
    const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (summaryText) {
      console.log("✅ Özet başarıyla alındı!");
      res.json({ summary: summaryText });
    } else {
      console.log("⚠️ Cevap boş geldi:", data);
      res.json({ summary: "Özet oluşturulamadı, ses çok kısa veya anlaşılmaz olabilir." });
    }

  } catch (error) {
    console.error("❌ Sunucu Hatası:", error);
    res.status(500).json({ summary: `Sunucu Hatası: ${error.message}` });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu Hazır (Manuel Mod): http://localhost:${PORT}`);
});
