const express = require("express")
const router = express.Router()
const QRCode = require("qrcode")
const os = require("os")

/* find current local IPv4 address */

// Allow overriding the QR host and protocol via environment variables for flexibility
const QR_HOST = process.env.QR_HOST || 'tyhjennys.dy.fi'
const QR_PROTOCOL = process.env.QR_PROTOCOL || 'https'

router.get('/qr/:bin', async (req, res) => {
    const bin = req.params.bin

    // Construct a canonical public URL for the bin page (used in printed QR labels)
    const text = `${QR_PROTOCOL}://${QR_HOST}/bin.html?bin=${encodeURIComponent(bin)}`

    try {
        const qr = await QRCode.toDataURL(text)
        res.json({ bin: bin, qr: qr, url: text })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: true })
    }
})

module.exports = router