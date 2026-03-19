const express = require("express")
const router = express.Router()
const QRCode = require("qrcode")

// Prefer an explicit public site URL (set via env) so generated QR codes
// point to the public domain instead of a local IP.
// Example: SITE_URL="https://tyhjennys.dy.fi"
// Default to the public site (use HTTPS) so generated QR codes point to the live domain.
const SITE_URL = process.env.SITE_URL || 'https://tyhjennys.dy.fi'

router.get("/qr/:bin", async (req,res)=>{

const bin = req.params.bin
// Build the public URL that the QR code should point to.
// We keep it simple: SITE_URL should include protocol and optional port.
const text = `${SITE_URL.replace(/\/+$/, '')}/bin.html?bin=${bin}`

try{
    const qr = await QRCode.toDataURL(text)

    res.json({
    bin:bin,
    qr:qr
    })
    }catch(err){
        console.error(err)
        res.status(500).json({error:true})
    }

})

module.exports = router