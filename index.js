// Dial Buddy - WhatsApp Bot (Baileys 6.7.16 + Express + Pino)
const fs = require("fs");
const path = require("path");
const express = require("express");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = require("@whiskeysockets/baileys");

// ===================== CONFIG =====================
const PORT = process.env.PORT || 10000;
const PAIRING_NUMBER = (process.env.PAIRING_NUMBER || "916389121501").replace(/\D/g, "");
const AUTH_DIR = path.join(__dirname, "auth_info");
const logger = pino({ level: "silent" });

// ===================== BUSINESS DATA =====================
// NOTE: Neeche ke numbers/naam SAMPLE hain. Apne asli listings se badal lena.
const DIRECTORY = {
  kirana: {
    title: "🛒 Kirana Shops - Sitapur",
    list: [
      { name: "Sharma General Store", phone: "9XXXXXXXX1", area: "Station Road" },
      { name: "Gupta Kirana Bhandar", phone: "9XXXXXXXX2", area: "Lahartara" },
      { name: "Verma Provision Store", phone: "9XXXXXXXX3", area: "Civil Lines" },
    ],
  },
  medical: {
    title: "💊 Medical Stores - Sitapur",
    list: [
      { name: "Jan Seva Medical Store", phone: "9XXXXXXXX4", area: "Station Road" },
      { name: "Apollo Pharmacy Point", phone: "9XXXXXXXX5", area: "Civil Lines" },
      { name: "Shree Ram Medicos", phone: "9XXXXXXXX6", area: "Khairabad Road" },
    ],
  },
  electrician: {
    title: "⚡ Electricians - Sitapur",
    list: [
      { name: "Rajesh Electrician", phone: "9XXXXXXXX7", area: "Sitapur City" },
      { name: "Sonu Electrical Works", phone: "9XXXXXXXX8", area: "Lahartara" },
      { name: "Ali Electric Service", phone: "9XXXXXXXX9", area: "Civil Lines" },
    ],
  },
};

const GREETING_WORDS = ["hi", "hello", "hlo", "hey", "help", "menu", "start", "namaste"];
const MENU_TEXT =
  "Hi! Dial Buddy me swagat hai 👋\nAapko kya chahiye? Jaise: Kirana, Medical, Electrician\n\n" +
  "1️⃣ Kirana\n2️⃣ Medical\n3️⃣ Electrician\n\nBas naam ya number likh do 🙂";
const NUMBER_MAP = { "1": "kirana", "2": "medical", "3": "electrician" };

function formatCategory(key) {
  const cat = DIRECTORY[key];
  const lines = cat.list.map(
    (s, i) => `${i + 1}. *${s.name}*\n   📍 ${s.area}\n   📞 ${s.phone}`
  );
  return `${cat.title}\n\n${lines.join("\n\n")}\n\nDubara menu ke liye "Hi" likho.`;
}

function getReply(rawText) {
  const text = rawText.toLowerCase().trim();
  if (!text) return null;
  if (GREETING_WORDS.includes(text)) return MENU_TEXT;
  if (NUMBER_MAP[text]) return formatCategory(NUMBER_MAP[text]);
  for (const key of Object.keys(DIRECTORY)) {
    if (text.includes(key)) return formatCategory(key);
  }
  // Hindi spellings
  if (text.includes("dawai") || text.includes("dawa") || text.includes("pharmacy")) return formatCategory("medical");
  if (text.includes("grocery") || text.includes("rashan")) return formatCategory("kirana");
  if (text.includes("bijli") || text.includes("electric")) return formatCategory("electrician");
  return 'Samajh nahi aaya 😅\n"Hi" likho menu dekhne ke liye (Kirana / Medical / Electrician).';
}

// ===================== EXPRESS (Render ke liye) =====================
const app = express();
let botStatus = "starting";
app.get("/", (_req, res) => res.send(`Dial Buddy bot is running. Status: ${botStatus}`));
app.get("/health", (_req, res) => res.json({ ok: true, status: botStatus }));
app.listen(PORT, "0.0.0.0", () => console.log(`🌐 Server port ${PORT} pe chal raha hai`));

// Render free tier 15 min idle pe so jata hai - self ping
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  setInterval(() => {
    fetch(`${SELF_URL}/health`).catch(() => {});
  }, 10 * 60 * 1000);
}

// ===================== AUTH HELPERS =====================
function deleteAuthFolder() {
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log("🗑️  Auth folder delete ho gaya.");
  } catch (e) {
    console.error("Auth folder delete error:", e.message);
  }
}

// ===================== BOT =====================
let reconnectAttempts = 0;
let reconnectTimer = null;
let sock = null;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
    console.log("WA version:", version.join("."));
  } catch {
    console.log("WA version fetch fail, default use ho raha hai");
  }

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // QR neeche qrcode-terminal se print hota hai (duplicate se bachne ke liye)
    browser: Browsers.ubuntu("Chrome"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: false,
    syncFullHistory: false,
    keepAliveIntervalMs: 25000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    retryRequestDelayMs: 2000,
  });

  const thisSock = sock;

  // Pairing code (agar abhi tak login nahi hai)
  if (!state.creds.registered && PAIRING_NUMBER) {
    setTimeout(async () => {
      try {
        if (thisSock !== sock || thisSock.authState.creds.registered) return;
        const code = await thisSock.requestPairingCode(PAIRING_NUMBER);
        const pretty = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log("\n=================================");
        console.log(`🔑 PAIRING CODE: ${pretty}`);
        console.log(`📱 Number: ${PAIRING_NUMBER}`);
        console.log("WhatsApp > Linked Devices > Link with phone number");
        console.log("=================================\n");
      } catch (e) {
        console.error("Pairing code error:", e.message);
      }
    }, 4000);
  }

  thisSock.ev.on("creds.update", saveCreds);

  thisSock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      botStatus = "waiting for QR / pairing";
      console.log("\n📷 QR Code (WhatsApp > Linked Devices > Link a device se scan karo):\n");
      qrcode.generate(qr, { small: true });
      console.log("\nYa upar wala Pairing Code use karo.\n");
    }

    if (connection === "open") {
      botStatus = "connected";
      reconnectAttempts = 0;
      console.log("✅ WhatsApp connected! Dial Buddy bot live hai.");
    }

    if (connection === "close") {
      botStatus = "disconnected";
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(`❌ Connection closed. Code: ${code}`);

      const authBroken =
        code === DisconnectReason.loggedOut || // 401
        code === DisconnectReason.badSession || // 500
        code === DisconnectReason.forbidden; // 403

      if (authBroken) {
        console.log("⚠️  Auth fail - auth folder delete karke fresh start...");
        deleteAuthFolder();
        scheduleReconnect(2000);
      } else if (code === DisconnectReason.restartRequired) {
        scheduleReconnect(500); // pairing ke baad normal hai
      } else {
        reconnectAttempts++;
        const delay = Math.min(3000 * reconnectAttempts, 30000);
        console.log(`🔄 ${delay / 1000}s me reconnect...`);
        scheduleReconnect(delay);
      }
    }
  });

  thisSock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (!jid || jid === "status@broadcast" || jid.endsWith("@g.us")) continue;

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          "";

        const reply = getReply(text);
        if (reply) await thisSock.sendMessage(jid, { text: reply }, { quoted: msg });
      } catch (e) {
        console.error("Message handle error:", e.message);
      }
    }
  });
}

function scheduleReconnect(delay) {
  if (reconnectTimer) return;
  try {
    sock?.ev?.removeAllListeners();
    sock?.end?.(undefined);
  } catch {}
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startBot().catch((e) => {
      console.error("startBot error:", e.message);
      scheduleReconnect(5000);
    });
  }, delay);
}

process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e?.message || e));
process.on("uncaughtException", (e) => console.error("uncaughtException:", e?.message || e));

startBot().catch((e) => {
  console.error("Start error:", e.message);
  scheduleReconnect(5000);
});

