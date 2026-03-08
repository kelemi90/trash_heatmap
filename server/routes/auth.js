const express = require("express")
const router = express.Router()
const bcrupt = require("bcrypt")
const db = require("../db")

router.post("/login",(req,res)=>{

const {username,password} = req.body

db.get("SELECT * FROM users WHERE username=?", [username], async (err,user)=>{
if(!user) return res.json({success:false})

const valid = await bcrytp.compape(password,user.password)

if(!valid) return res.json({success:false})

req.session.user = user.username
req.session.role = user.role

res.json({success:true})

})

})

module.exports =router