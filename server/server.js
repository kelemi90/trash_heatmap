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

const app = express()

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

/* -----------------------------
   PROTECT ADMIN PAGE
----------------------------- */

app.get("/admin.html", adminAuth, (req,res)=>{
    res.sendFile(path.join(__dirname,"../public/admin.html"))
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

/* -----------------------------
   START SERVER
----------------------------- */

const ip = getLocalIP()

app.listen(3001,()=>{

    console.log("")
    console.log("🚀 Trash Heatmap Server Running")
    console.log("")
    console.log(`Local:   http://localhost:3001`)
    console.log(`Network: http://${ip}:3001`)
    console.log("")

})