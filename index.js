const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const app = express()
app.get('/', (req,res)=>res.send('BOT LIVE - PAIRING CODE KE LIYE LOGS DEKHO'))
app.listen(10000)

async function start(){
const { state, saveCreds } = await useMultiFileAuthState('auth_info')
const sock = makeWASocket({
auth: state,
logger: P({level:'silent'}),
browser: Browsers.macOS('Desktop')
})
sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', async (u)=>{
console.log(u)
if(u.connection === 'open') console.log('✅✅ BOT CONNECT HO GAYA ✅✅')
})

if(!sock.authState.creds.registered){
setTimeout(async ()=>{
try{
let phone = '916389121501' // Yahan apna number daalo bina + ke
let code = await sock.requestPairingCode(phone)
console.log(`\n\n==================\nPAIRING CODE: ${code}\nNUMBER: ${phone}\n==================\n\n`)
console.log('WhatsApp > Linked Devices > Link with phone number > Code daalo')
}catch(e){ console.log('Error:', e.message) }
}, 8000)
}
}
start()
