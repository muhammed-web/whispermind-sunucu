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

// Dosya yükleme alanı
app.post("/summarize", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ summary: "Hata: Dosya sunucuya ulaşmadı." });
    }

    console.log("📩 Dosya alındı! Boyut:", req.file.size, "byte");
    console.log("📂 Gelen Dosya Tipi:", req.file.mimetype); 

    // DÜZELTME 1: Modeli 1.5 Flash yaptık (Kotaya takılmamak için)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // Dosya tipini algıla
    let mimeType = req.file.mimetype;
    
    // DÜZELTME 2: Telefondan 'octet-stream' gelirse bunu SES dosyası olarak kabul et
    if (mimeType === "application/octet-stream") {
        console.log("⚠️ Tanımsız dosya tipi algılandı, ses dosyası (audio/mp3) varsayılıyor.");
        mimeType = "audio/mpeg"; // Ses uygulaması olduğu için mp3 varsayıyoruz
    }

    const filePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: mimeType, 
      },
    };

    console.log(`🤖 Google Yapay Zekaya (${mimeType}) olarak gönderiliyor...`);

    // İstek metnini ayarla
    let prompt = "Bu ses kaydını dinle. Konuşulanları Türkçe olarak özetle.";
    
    // Eğer olur da PDF gelirse diye promptu esnek tutalım
    if (mimeType === "application/pdf") {
        prompt = "Bu dosyayı incele ve içeriğini Türkçe olarak özetle.";
    }

    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Özet başarıyla oluşturuldu!");
    res.json({ summary: text });

  } catch (error) {
    console.error("❌ HATA OLUŞTU:", error);
    
    // Hatayı detaylı görelim
    let errorMessage = "Sunucu Hatası";
    if (error.response && error.response.promptFeedback) {
        errorMessage = "Yapay zeka güvenliği nedeniyle yanıt veremedi.";
    } else if (error.message) {
        errorMessage = error.message;
    }

    res.status(500).json({
      summary: `Hata: ${errorMessage}`,
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mutfak (Sunucu) Hazır: http://localhost:${PORT}`);
});

