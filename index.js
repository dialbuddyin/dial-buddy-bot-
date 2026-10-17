const fs = require('fs')
const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const app = express()
app.get('/', (req,res)=>res.send('BOT FIXED - LOGS DEKHO'))
app.listen(10000)

// Purana auth delete karo agar error hai
if(fs.existsSync('auth_info')){
  try{ fs.rmSync('auth_info', {recursive:true, force:true}); console.log('Purana auth delete kiya') }catch(e){}
}

async function start(){
console.log('Starting...')
const { state, saveCreds } = await useMultiFileAuthState('auth_info')
const sock = makeWASocket({
auth: state,
logger: P({level:'silent'}),
browser: Browsers.macOS('Desktop'),
printQRInTerminal: true,
syncFullHistory: false
})
sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', async (u)=>{
console.log('Update:', u)
const { connection, lastDisconnect, qr } = u
if(qr) console.log('QR MILA - SCAN KARO LOGS ME')

if(connection === 'close'){
  let shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401
  console.log('Close, Reconnect:', shouldReconnect)
  if(shouldReconnect) start()
  else {
    console.log('Auth fail - folder delete karke restart')
    if(fs.existsSync('auth_info')) fs.rmSync('auth_info', {recursive:true, force:true})
    start()
  }
}
if(connection === 'open'){
  console.log('✅✅ CONNECT HO GAYA - BOT LIVE ✅✅')
}
})

if(!sock.authState.creds.registered){
  setTimeout(async ()=>{
    try{
      let code = await sock.requestPairingCode('916389121501')
      console.log(`\n\nPAIRING CODE: ${code}\n\n`)
    }catch(e){ console.log('Pairing wait:', e.message) }
  }, 10000)
}

sock.ev.on('messages.upsert', async (m)=>{
try{
let msg=m.messages[0]; if(!msg.message||msg.key.fromMe) return
let text=(msg.message.conversation||msg.message.extendedTextMessage?.text||'').toLowerCase()
let from=msg.key.remoteJid
if(text.includes('hi')) await sock.sendMessage(from,{text:'Hi! Dial Buddy Live 👋'})
}catch(e){}
})
}
start()
