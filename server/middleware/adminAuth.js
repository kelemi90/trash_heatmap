function adminAuth(req, res, next){
    if(req.session && req.session.admin){
        next()
    }else{
        res.redirect("/admin_login.html")
    }
}
module.exports = adminAuth