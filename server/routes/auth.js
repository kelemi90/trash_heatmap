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
	return req.session.save((err)=>{
		if(err) console.error('[auth/login] session.save error', err)
		try{ console.log(`[auth/login] pid=${process.pid} sessionSaved sessionID=${req.sessionID}`) }catch(e){}
			try{ console.log('[auth/login] Set-Cookie header before respond:', res.getHeader && res.getHeader('Set-Cookie')) }catch(e){}
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

// Temporary debug endpoint to inspect session state from the client.
// Enabled only when not in production to avoid leaking session info.
router.get('/admin/debug-session', (req, res) => {
	if(process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'forbidden' })
	try{
		return res.json({
			sessionID: req.sessionID || null,
			session: req.session || null,
			// include raw Cookie header so we can inspect what the browser sent
			cookieHeader: req.headers && req.headers.cookie ? req.headers.cookie : null
		})
	}catch(e){
		return res.status(500).json({ error: String(e) })
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

// Attempt to destroy the server session and clear the cookie with
// the same attributes used when creating it. Clearing with matching
// domain/path/secure flags reduces cases where the browser keeps an
// existing cookie because attributes differ.
const sid = req.sessionID
req.session.destroy((err)=>{
	try{
		const cookieOptions = {
			path: '/',
			httpOnly: true,
			sameSite: 'lax'
		}
		// mirror secure flag logic used in server/session setup
		if(process.env.NODE_ENV === 'production' && process.env.PUBLIC_PROTOCOL === 'https'){
			cookieOptions.secure = true
		}
		// If PUBLIC_HOST is set, explicitly clear the cookie for that domain
		if(process.env.PUBLIC_HOST) cookieOptions.domain = process.env.PUBLIC_HOST

		res.clearCookie('connect.sid', cookieOptions)
	}catch(e){}

	try{ console.log(`[auth/logout] pid=${process.pid} destroyed sessionID=${sid} err=${err ? String(err) : 'none'}`) }catch(e){}

	if(err) return res.status(500).json({success:false,error:String(err)})
	res.json({success:true})
})

})

module.exports = router