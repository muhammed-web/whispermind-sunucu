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

// Dosya yükleme alanı adını "file" olarak genelleyelim veya "audio" kalsın
// (Flutter tarafında gönderirken 'audio' key'ini kullanıyorsan burası 'audio' kalmalı)
app.post("/summarize", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ summary: "Hata: Dosya sunucuya ulaşmadı." });
    }

    console.log("📩 Dosya alındı! Boyut:", req.file.size, "byte");
    console.log("📂 Dosya Tipi:", req.file.mimetype); // Loglarda tipi görelim

    // Modeli seç (Gemini 1.5 Flash - Ücretsiz ve Hızlı)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Dosya tipini (PDF mi Ses mi?) otomatik algıla
    // Eğer Flutter doğru mimetype göndermiyorsa varsayılanı ayarla
    let mimeType = req.file.mimetype;
    
    // Bazen mobilden gelen dosyalarda mimetype boş olabilir, kontrol edelim:
    if (mimeType === "application/octet-stream") {
        // Dosya uzantısına bakarak tahmin etmeye çalışabiliriz ama
        // şimdilik varsayılan olarak PDF deneyelim (veya mp4)
        // Senin durumunda PDF ağırlıklıysa:
        mimeType = "application/pdf"; 
    }

    const filePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: mimeType, 
      },
    };

    console.log(`🤖 Google Yapay Zekaya (${mimeType}) gönderiliyor...`);

    // İstek metnini dosya türüne göre ayarla
    let prompt = "Bu dosyayı incele ve içeriğini Türkçe olarak özetle.";
    
    if (mimeType.startsWith("audio")) {
        prompt = "Bu ses kaydını dinle. Konuşulanları Türkçe olarak özetle.";
    }

    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Özet başarıyla oluşturuldu!");
    res.json({ summary: text });
  } catch (error) {
    console.error("❌ HATA OLUŞTU:", error);
    res.status(500).json({
      summary: `Sunucu Hatası: ${error.message || error}`,
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mutfak (Sunucu) Hazır: http://localhost:${PORT}`);
});

