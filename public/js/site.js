// Site-wide utilities

window.logout = async function(){
  try{
    await fetch('/api/admin/logout',{ method: 'POST', credentials: 'same-origin' })
  }catch(e){
    console.warn('Logout request failed', e)
  }
  // Best-effort client-side cleanup: unregister service workers, clear caches
  // and clear localStorage that might hold a cached "logged-in" state.
  try{
    // unregister all service workers for this origin
    if(navigator && navigator.serviceWorker && typeof navigator.serviceWorker.getRegistrations === 'function'){
      const regs = await navigator.serviceWorker.getRegistrations()
      for(const r of regs) try{ await r.unregister() }catch(e){}
    }
    // clear caches (if any)
    if(window.caches && typeof window.caches.keys === 'function'){
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    // clear localStorage (best-effort; avoid throwing)
    try{ localStorage.clear() }catch(e){}
  }catch(e){ /* ignore cleanup errors */ }

  // Redirect to dashboard after logout
  window.location = '/dashboard.html'
}

// small helper to mark active nav link by href
window.markActiveNav = function(){
  try{
    const links = document.querySelectorAll('.nav-links a')
    const current = window.location.pathname.replace(/^\//,'')
    links.forEach(a=>{
      // clear previous active state
      a.classList.remove('active')
      let href = a.getAttribute('href') || ''
      // normalize: remove leading slash and strip query/hash
      href = href.replace(/^\//,'').split(/[?#]/)[0]
      if(href === current){
        a.classList.add('active')
      }
    })
  }catch(e){}
}

// adjust navbar based on admin session state
window.adjustNavbarAuth = async function(){
  try{
    const res = await fetch('/api/admin/check',{ credentials: 'same-origin' })
    const data = await res.json()
    const nav = document.querySelector('.nav-links')
    const navRight = document.querySelector('.nav-right')

    // links we want to hide when logged out
    const adminLinks = ['/admin.html','/bin_editor.html','/qr_labels.html']

    if(!data.logged){
      // hide admin links
      if(nav){
        nav.querySelectorAll('a').forEach(a=>{
          const href = (a.getAttribute('href')||'').split(/[?#]/)[0]
          if(adminLinks.includes(href)) a.style.display = 'none'
        })
      }

      // show login button on right
      if(navRight){
        navRight.innerHTML = `<a href="/admin_login.html" class="login-btn">Login</a>`
      }
    }else{
      // show admin links
      if(nav){
        nav.querySelectorAll('a').forEach(a=>{ a.style.display = '' })
      }

      // show logout button
      if(navRight){
        navRight.innerHTML = `<button onclick="logout()">Logout</button>`
      }
    }
  }catch(e){
    // ignore network errors
  }
}
