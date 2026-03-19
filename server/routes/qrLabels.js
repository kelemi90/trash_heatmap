const express = require("express")
const router = express.Router()
const QRCode = require("qrcode")
const os = require("os")

/* find current local IPv4 address */

function getLocalIP(){
    const nets = os.networkInterfaces()
    for(const name of Object.keys(nets)){
        for(const net of nets[name]){
            if(net.family == "IPv4" && !net.internal){
                return net.address
            }
        }
    }
    return "localhost"
}
const PORT = 3001

router.get("/qr/:bin", async (req,res)=>{

const bin = req.params.bin
const ip = getLocalIP()

const text = `http://${ip}:${PORT}/bin.html?bin=${bin}`

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