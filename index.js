const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// !!! --- هام جداً: ضع رابط نشر جوجل سكربت هنا --- !!!
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz8EeBzyzOyRJXK8qBCoFplxBUcAumhVzwZD1HAZXHaV4pUsbKy7wHS6WK8RORC_Wvp/exec";
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// توجيه الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// نقطة الاتصال (API Proxy Endpoint)
app.post("/api", async (req, res) => {
  try {
    // استقبال البيانات من الواجهة (مثل: { action: 'history', date: '...' })
    const payload = req.body;

    // إعادة إرسالها إلى جوجل سكربت
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error calling Google Script:", error);
    res.status(500).json({
      status: "error",
      message: "خطأ في الاتصال بالسيرفر: " + error.message,
    });
  }
});

// تشغيل السيرفر
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
