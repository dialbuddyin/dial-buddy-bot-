const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')

const app = express()
app.get('/', (req,res)=>res.send('BOT LIVE - QR ke liye Logs dekho'))
app.listen(10000)

async function start(){
const { state, saveCreds } = await useMultiFileAuthState('auth')
const sock = makeWASocket({
auth: state,
logger: P({level:'silent'}),
browser: Browsers.macOS('Chrome'),
printQRInTerminal: true
})

sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', (u)=>{
if(u.qr) console.log('QR CODE UPAR HAI - SCAN KARO')
if(u.connection === 'open') console.log('✅ CONNECT HO GAYA - BOT LIVE ✅')
if(u.connection === 'close') start()
})

sock.ev.on('messages.upsert', async (m)=>{
try{
let msg = m.messages[0]
if(!msg.message || msg.key.fromMe) return
let text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase()
let from = msg.key.remoteJid

if(text === 'hi' || text === 'hello' || text === 'hii'){
await sock.sendMessage(from, {text:'*DIAL BUDDY - TDI Panipat* 👋\n\n1️⃣ Plumber - Rs150\n2️⃣ Electrician - Rs200\n3️⃣ RO Service\n4️⃣ Cart\n\nKya chahiye? Naam likho - Jaise *PLUMBER*'})
}
else if(text.includes('plumber')){
await sock.sendMessage(from, {text:'🔧 *PLUMBER*\nCharge Rs150 visit\nPanipat TDI Only\n\nBook? *PLUMBER YES* likho'})
}
else if(text.includes('yes')){
await sock.sendMessage(from, {text:'✅ Booking noted! 10 min me call ayega\nLocation bhejo'})
}
else{
await sock.sendMessage(from, {text:'HI likho menu ke liye 👆'})
}
}catch(e){ console.log(e) }
})
}

start()
