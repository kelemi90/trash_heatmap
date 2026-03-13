const express = require("express")
const path = require("path")
const os = require("os")
const session = require("express-session")
const sqlite3 = require("sqlite3").verbose()

const adminAuth = require("./middleware/adminAuth")
const auth = require("./routes/auth")
const bins = require("./routes/bins")
const logs = require("./routes/logs")
const users = require("./routes/users")
const qrLabels = require("./routes/qrLabels")

const logger = require('./logger')

const app = express()

// Log node process errors so we can inspect crashes
process.on('uncaughtException', (err)=>{
    try{ logger.error('uncaughtException: ' + (err && err.stack ? err.stack : String(err))) }catch(e){ console.error(e) }
    // allow default behavior after logging
    process.exit(1)
})

process.on('unhandledRejection', (reason, promise)=>{
    try{ logger.error('unhandledRejection: ' + (reason && reason.stack ? reason.stack : String(reason))) }catch(e){ console.error(e) }
})

/* -----------------------------
   GET LOCAL IP
----------------------------- */

function getLocalIP(){

    const nets = os.networkInterfaces()

    for(const name of Object.keys(nets)){
        for(const net of nets[name]){

            if(net.family === "IPv4" && !net.internal){
                return net.address
            }

        }
    }

    return "localhost"
}

/* -----------------------------
   MIDDLEWARE
----------------------------- */

app.use(express.json())
app.use(session({
secret:"trashsecret",
resave:false,
saveUninitialized:false,
cookie:{
maxAge:1000*60*60*2
}
}))

// Request logging middleware
app.use((req,res,next)=>{
    try{ logger.info(`${req.method} ${req.url} from ${req.ip}`) }catch(e){}
    next()
})

/* -----------------------------
   PROTECT ADMIN PAGE
----------------------------- */

app.get("/admin.html", adminAuth, (req,res)=>{
    res.sendFile(path.join(__dirname,"../public/admin.html"))
})

// Protect bin editor and QR labels pages so they require admin login
app.get("/bin_editor.html", adminAuth, (req,res)=>{
    res.sendFile(path.join(__dirname,"../public/bin_editor.html"))
})

app.get("/qr_labels.html", adminAuth, (req,res)=>{
    res.sendFile(path.join(__dirname,"../public/qr_labels.html"))
})

/* -----------------------------
   PUBLIC FILES
----------------------------- */

app.use(express.static(path.join(__dirname,"../public")))

/* -----------------------------
   API ROUTES
----------------------------- */

app.use("/api", auth)
app.use("/api", bins)
app.use("/api", logs)
app.use("/api", users)
app.use("/api", qrLabels)

// Error logging middleware (should be after routes)
app.use((err, req, res, next) => {
    try{
        logger.error(`Error on ${req.method} ${req.url} - ${err && err.stack ? err.stack : err}`)
    }catch(e){ console.error(e) }
    res.status(500).json({error:true})
})

/* -----------------------------
   START SERVER
----------------------------- */

const ip = getLocalIP()

app.listen(3001,()=>{

    logger.info('\n')
    logger.info('🚀 Trash Heatmap Server Running')
    logger.info('\n')
    logger.info(`Local:   http://localhost:3001`)
    logger.info(`Network: http://${ip}:3001`)
    logger.info('\n')

})