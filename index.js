const { default: makeWASocket, useMultiFileAuthState, Browsers, printQRInTerminal } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const app = express()

app.get('/', (req,res)=>res.send('Dial Buddy LIVE - QR Ready'))
app.listen(10000, ()=>console.log('Server Live on 10000'))

async function startBot(folder, number){
    const { state, saveCreds } = await useMultiFileAuthState(folder)
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', async (u)=>{
        const { connection, qr } = u
        if(qr) {
            console.log(`\n========== ${number} KA QR UPAR HAI - SCAN KARO ==========\n`)
        }
        if(connection === 'open'){
            console.log(`\n✅✅ ${number} CONNECT HO GAYA - BUDDY LIVE ✅✅✅\n`)
        }
    })

    // Pairing code bhi chahiye toh ye chalega
    if(!sock.authState.creds.registered){
        setTimeout(async ()=>{
            try{
                let code = await sock.requestPairingCode(number)
                console.log(`\n===== ${number} KA PAIRING CODE: ${code} =====\n`)
            }catch(e){
                console.log('Pairing code error, QR se karo - ' + number)
            }
        }, 5000)
    }

    // Auto Reply
    sock.ev.on('messages.upsert', async (m)=>{
        try{
            let msg = m.messages[0]
            if(!msg.message || msg.key.fromMe) return
            let text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase()
            let from = msg.key.remoteJid

            if(text.includes('hi') || text.includes('hello')){
                await sock.sendMessage(from, { text: `Hi! 👋 Main Dial Buddy hu Panipat TDI ka\n\n1. Plumber\n2. Electrician\n3. RO\n4. Cart\n\nKya chahiye likho?` })
            }
            else if(text.includes('plumber')){
                await sock.sendMessage(from, { text: `🔧 Plumber Service\nCharges: Rs 150 visit\nLocation: Panipat TDI only\n\nBook karne ke liye PLUMBER YES likho` })
            }
            else{
                await sock.sendMessage(from, { text: `Samajh nahi aaya - HI likho menu ke liye` })
            }
        }catch(e){}
    })
}

startBot('auth_buddy', '916389121501')
startBot('auth_user', '916393885050')
