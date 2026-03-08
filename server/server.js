const express = require("express")
const session = require("express-session")
const path = require("path")

const app = express()

app.use(express.json())

app.use(session({
secret:"trashsecret",
resave:false,
saveUninitialized:true
}))

app.use(express.static(path.join(__dirname,"../public")))

const auth = require("./routes/auth")
const bins = require("./routes/bins")
const logs = require("./routes/logs")

app.use("/api",auth)
app.use("/api",bins)
app.use("/api",logs)

app.listen(3000,()=>{
console.log("Server running on port 3000")
})