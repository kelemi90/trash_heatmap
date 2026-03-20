const express = require("express")
const path = require("path")
const os = require("os")
const session = require("express-session")
const sqlite3 = require("sqlite3").verbose()
const RedisStore = require('connect-redis')(session)
const { createClient } = require('redis')

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

// Configure Redis-backed session store (recommended for production)
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const redisClient = createClient({ url: redisUrl })
redisClient.on('error', (err) => { try{ logger.error('Redis Client Error: ' + err) }catch(e){ console.error(e) } })
redisClient.connect().catch((err)=>{ try{ logger.error('Failed to connect to Redis: ' + err) }catch(e){ console.error(e) } })

app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'KuMm1tus',
    resave:false,
    saveUninitialized:false,
    cookie:{
        maxAge:1000*60*60*2,
        httpOnly: true,
        secure: (process.env.PUBLIC_PROTOCOL === 'https' || process.env.NODE_ENV === 'production'),
        sameSite: 'lax'
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

// Redirect any request under /qr to the API equivalent before static middleware
// This uses app.use so it matches GET/HEAD/POST etc and will catch requests like
// /qr/7 and /qr/7/ (if any).
app.use('/qr', (req, res, next) => {
    // Preserve the full original URL (path + query) but rewrite the leading
    // `/qr` to `/api/qr` so `/qr/7?x=1` -> `/api/qr/7?x=1`.
    // Using req.originalUrl keeps query string and any extra path parts.
    const target = req.originalUrl.replace(/^\/qr\b/, '/api/qr')
    return res.redirect(307, target)
})

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
     - support configurable bind address and public host/protocol via env
----------------------------- */

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001
const BIND_ADDR = process.env.BIND_ADDR || '0.0.0.0'
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'tyhjennys.dy.fi'
const PUBLIC_PROTOCOL = process.env.PUBLIC_PROTOCOL || 'https'

const ip = getLocalIP()

function formatPublicURL(){
    // Omit port for standard http/https ports
    if ((PUBLIC_PROTOCOL === 'https' && PORT === 443) || (PUBLIC_PROTOCOL === 'http' && PORT === 80)){
        return `${PUBLIC_PROTOCOL}://${PUBLIC_HOST}`
    }
    return `${PUBLIC_PROTOCOL}://${PUBLIC_HOST}:${PORT}`
}

app.listen(PORT, BIND_ADDR, ()=>{
        logger.info('\n')
        logger.info('🚀 Trash Heatmap Server Running')
        logger.info('\n')
        logger.info(`Local:   http://localhost:${PORT}`)
        logger.info(`Network: http://${ip}:${PORT}`)
        logger.info(`Public:  ${formatPublicURL()}`)
        logger.info('\n')
})