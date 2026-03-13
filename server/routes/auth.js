const express = require("express")
const router = express.Router()

router.post("/admin/login",(req,res)=>{

const username = req.body?.username
const password = req.body?.password

if(username === "Buildcat" && password === "buildcat"){

req.session.admin = true
return res.json({success:true})

}

res.json({success:false})

})

router.get("/admin/check",(req,res)=>{

if(req.session && req.session.admin){
res.json({logged:true})
}else{
res.json({logged:false})
}

})

router.post("/admin/logout",(req,res)=>{

req.session.destroy(()=>{
res.json({success:true})
})

})

module.exports = router