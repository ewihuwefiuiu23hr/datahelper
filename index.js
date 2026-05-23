const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

// Shared secret so only your Apps Script can use this relay
const RELAY_SECRET = process.env.RELAY_SECRET;

const transporter = nodemailer.createTransport({
  host: process.env.RUNBOX_HOST || "mail.runbox.com",
  port: 587,
  secure: false, // STARTTLS
  requireTLS: true,
  auth: {
    user: process.env.RUNBOX_USERNAME,
    pass: process.env.RUNBOX_PASSWORD
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

transporter.verify(function(error, success) {
  if (error) {
    console.error("SMTP connection failed:", error);
  } else {
    console.log("SMTP connection verified, ready to send");
  }
});

app.post("/send", async (req, res) => {
  // Authenticate the request
  const secret = req.headers["x-relay-secret"];
  if (!RELAY_SECRET || secret !== RELAY_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { to, cc, subject, html, from, replyTo } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, html" });
  }

  try {
    const mailOptions = {
      from: from || `"Student update" <${process.env.RUNBOX_USERNAME}>`,
      to,
      subject,
      html,
      replyTo: replyTo || undefined
    };
    if (cc) mailOptions.cc = cc;

    const info = await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("SMTP error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/", (req, res) => res.send("Relay running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Relay listening on port ${PORT}`));
