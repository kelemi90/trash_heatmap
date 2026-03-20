function adminAuth(req, res, next){
    if(req.session && req.session.admin){
        return next()
    }

    // If this is an API request (JSON expected) or an XHR, respond 401 JSON
    const acceptsJSON = (req.headers['accept'] || '').includes('application/json')
    const isApiPath = (req.originalUrl || req.url || '').startsWith('/api')
    const isXhr = req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest'

    if(acceptsJSON || isApiPath || isXhr){
        return res.status(401).json({ error: 'unauthorized' })
    }

    // Fallback: redirect to interactive login page
    res.redirect('/admin_login.html')
}

module.exports = adminAuth