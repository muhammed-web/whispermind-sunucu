const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());

// Dosyaları hafızada tut
const upload = multer({ storage: multer.memoryStorage() });

// 1. TEŞHİS ROTASI
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
// upload.single("audio") -> Sadece ses dosyasını alır
// req.body -> Diğer metin verilerini (dil seçimi vb.) alır
app.post("/summarize", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ summary: "Hata: Dosya yok." });
    
    // Telefondan gelen dil kodunu al (yoksa varsayılan Türkçe olsun)
    // Örn: "en", "de", "fr"
    const userLanguage = req.body.language || "tr";

    console.log(`📩 Dosya geldi! Boyut: ${req.file.size} - İstenen Dil: ${userLanguage}`);
    
    const apiKey = process.env.GEMINI_API_KEY;
    const base64Data = req.file.buffer.toString("base64");
    const modelName = "gemini-flash-latest"; 

    // İŞTE SİHİR BURADA: Promptu dile göre dinamik yapıyoruz
    // Diller için basit bir sözlük
    const prompts = {
        "tr": "Bu ses kaydını dinle ve konuşulanları Türkçe olarak detaylıca özetle. Başlıklar ve maddeler kullan.",
        "en": "Listen to this audio and summarize the spoken content in English in detail. Use headings and bullet points.",
        "de": "Hören Sie sich diese Audioaufnahme an und fassen Sie den gesprochenen Inhalt ausführlich auf Deutsch zusammen. Verwenden Sie Überschriften und Aufzählungszeichen.",
        "es": "Escucha este audio y resume el contenido hablado en español detalladamente. Usa encabezados y viñetas.",
        "fr": "Écoutez cet enregistrement audio et résumez le contenu parlé en français en détail. Utilisez des titres et des puces.",
        "ru": "Прослушайте эту аудиозапись и подробно перескажите содержание на русском языке. Используйте заголовки и пункты.",
        "ar": "استمع إلى هذا التسجيل الصوتي ولخص المحتوى المنطوق باللغة العربية بالتفصيل. استخدم العناوين والنقاط."
    };

    // Eğer bilinmeyen bir dil gelirse İngilizce yap
    const selectedPrompt = prompts[userLanguage] || prompts["en"];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
              text: selectedPrompt 
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
      console.error("Google Hatası:", JSON.stringify(data.error, null, 2));
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
