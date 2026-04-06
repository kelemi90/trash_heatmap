// Site-wide utilities

window.logout = async function(){
  try{
    await fetch('/api/admin/logout',{ method: 'POST', credentials: 'same-origin' })
  }catch(e){
    console.warn('Logout request failed', e)
  }
  // Redirect to login regardless
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

      // Ensure login is reachable on small screens: nav-right is hidden by CSS
      // so also add a login link into the drawer (.nav-links) when viewport is narrow.
      if(nav){
        // remove any leftover login-btn in nav-links first
        const existing = nav.querySelectorAll('a.login-btn')
        existing.forEach(e=>e.remove())
        if(window.matchMedia && window.matchMedia('(max-width:800px)').matches){
          const a = document.createElement('a')
          a.href = '/admin_login.html'
          a.className = 'login-btn'
          a.textContent = 'Login'
          nav.appendChild(a)
        }
      }
    }else{
      // show admin links
      if(nav){
        nav.querySelectorAll('a').forEach(a=>{ a.style.display = '' })
        // remove any login links that may have been injected into nav-links
        nav.querySelectorAll('a.login-btn').forEach(a=>a.remove())
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

// Toggle mobile navigation drawer
window.toggleMobileNav = function(){
  try{
    document.body.classList.toggle('nav-open')
  }catch(e){}
}

// Close mobile nav when clicking links (delegated)
document.addEventListener('click', (ev)=>{
  try{
    const a = ev.target.closest && ev.target.closest('.nav-links a')
    if(a && document.body.classList.contains('nav-open')){
      document.body.classList.remove('nav-open')
    }
  }catch(e){}
})
