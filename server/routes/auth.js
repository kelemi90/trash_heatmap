const express = require("express")
const router = express.Router()

router.post("/admin/login",(req,res)=>{

const username = req.body?.username
const password = req.body?.password

if(username === "Buildcat" && password === "buildcat"){

req.session.admin = true
	// store admin username for audit logging
	req.session.username = username
	// debug log session info and ensure session is saved before responding
	try{ console.log(`[auth/login] pid=${process.pid} sessionID=${req.sessionID} sessionBefore=${JSON.stringify(req.session)}`) }catch(e){}
	req.session.save((err)=>{
		if(err) console.error('[auth/login] session.save error', err)
		try{ console.log(`[auth/login] pid=${process.pid} sessionSaved sessionID=${req.sessionID}`) }catch(e){}
		return res.json({success:true})
	})

}

res.json({success:false})

})

router.get("/admin/check",(req,res)=>{

if(req.session && req.session.admin){
res.json({logged:true, username: req.session.username || null})
}else{
res.json({logged:false})
}

})


// Set admin nickname in session (must be logged in as admin)
router.post('/admin/set-nickname', (req, res) => {

	if (!req.session || !req.session.admin) {
		return res.status(401).json({ success: false, error: 'unauthorized' })
	}

	const nickname = req.body && req.body.nickname ? String(req.body.nickname).trim() : ''

	if (!nickname) return res.status(400).json({ success: false, error: 'nickname_required' })
	if (nickname.toLowerCase() === 'buildcat') return res.status(400).json({ success: false, error: 'nickname_invalid', message: 'Nickname cannot be Buildcat' })

	req.session.username = nickname
	return res.json({ success: true, username: nickname })

})

router.post("/admin/logout",(req,res)=>{

req.session.destroy((err)=>{
	// Clear session cookie in the browser to ensure logout on client side
	try{ res.clearCookie('connect.sid') }catch(e){}
	if(err) return res.status(500).json({success:false,error:String(err)})
	res.json({success:true})
})

})

module.exports = router