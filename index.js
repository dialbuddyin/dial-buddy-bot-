// DIAL BUDDY FINAL V6 - SCRATCH DEPLOYMENT - BOTH NUMBERS
// 6389121501 - Buddy Bot | 6393885050 - User Bot
const P = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const app = express();

app.get('/', (req,res)=> res.send('Dial Buddy V6 Live - QR ke liye logs dekho'));

async function startBot(phoneNumber, authFolder, botName){
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const sock = makeWASocket({
    auth: state,
    logger: P({level:'silent'}),
    browser: [botName, "Chrome", "110.0"],
    printQRInTerminal: true
  });
  sock.ev.on('creds.update', saveCreds);

  // Pairing Code - Agar QR scan nahi hota toh
  if(!state.creds.registered){
    try{
      setTimeout(async ()=>{
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n\n===== ${phoneNumber} KA PAIRING CODE: ${code} =====\n`);
        console.log(`WhatsApp > Linked Devices > Link with phone number > ${code}\n`);
      }, 5000);
    }catch(e){ console.log("Pairing code error, QR use karo"); }
  }

  sock.ev.on('connection.update', ({connection, lastDisconnect, qr})=>{
    if(qr){
      console.log(`\n\n========== QR FOR ${phoneNumber} - ${botName} ==========`);
      // QR Terminal pe ayega - Render logs me dikhega
    }
    if(connection==='open'){
      console.log(`✅ ${phoneNumber} - ${botName} LIVE`);
    }
    if(connection==='close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) startBot(phoneNumber, authFolder, botName);
    }
  });

  sock.ev.on('messages.upsert', async ({messages})=>{
    const m = messages[0];
    if(!m.message || m.key.fromMe) return;
    const text = (m.message.conversation || m.message.extendedTextMessage?.text || "").toLowerCase();
    const jid = m.key.remoteJid;
    
    if(text.includes('hi') || text.includes('hello') || text==='1'){
      await sock.sendMessage(jid, {text: `🔧 *Dial Buddy Panipat - ${botName} LIVE* ✅\n\n1️⃣ Plumber - Rs.199\n2️⃣ RO Repair - Rs.299\n3️⃣ Electrician - Rs.249\n\nType:\n🛒 *cart* - My Cart\n📋 *booking* - My Bookings\n📍 TDI Connaught Estate Only\n\nBot: ${phoneNumber}`});
    }
    else if(text.includes('cart')){
      await sock.sendMessage(jid, {text: `🛒 *My Cart*\nPlumber Service - Rs.199\nTotal: Rs.199\n\n*confirm* likho booking ke liye`});
    }
    else if(text.includes('confirm')){
      await sock.sendMessage(jid, {text: `🎉 *Booking Confirmed!*\nJob ID: DB${Date.now().toString().slice(-6)}\nBuddy 10 min me ayega - TDI Gate\n\nRating 1-5 dena\nBuddy: 6389121501\nUser: 6393885050`});
    }
    else if(text.includes('booking')){
      await sock.sendMessage(jid, {text: `📋 *My Bookings*\nJob DB1234 - Plumber - Confirmed\nStatus: Buddy on the way`});
    }
  });
}

// DONO NUMBER START
startBot('916389121501', './auth_buddy', 'Buddy Bot');
setTimeout(()=> startBot('916393885050', './auth_user', 'User Bot'), 8000);

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log(`Server running on ${PORT}`));
// Upar add karo:
const QRCode = require('qrcode-terminal');
