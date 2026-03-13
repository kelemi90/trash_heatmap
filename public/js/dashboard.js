// Dashboard client logic moved out of HTML

const mapEl = document.getElementById('map')
const heatLayer = document.getElementById('heatLayer')
const tooltip = document.getElementById('tooltip')

// heatmap instance (created after image load so sizing is correct)
let heatmap = null

function createHeatmap(){
  if(heatmap) return heatmap
  heatmap = h337.create({ container: heatLayer, radius: 40 })
  // ensure renderer dimensions match the container (heatmap.js internal API)
  try{
    const w = Math.max(1, heatLayer.clientWidth)
    const h = Math.max(1, heatLayer.clientHeight)
    if(heatmap._renderer && typeof heatmap._renderer.setDimensions === 'function'){
      heatmap._renderer.setDimensions(w,h)
    }
  }catch(e){ console.warn('heatmap resize failed',e) }
  return heatmap
}

// initialize heatmap when the map image is loaded (so container has correct size)
const mapImg = mapEl.querySelector('img')
if(mapImg){
  if(mapImg.complete){ createHeatmap() }
  else mapImg.addEventListener('load', ()=>{ createHeatmap(); refresh() })
}

// Helper: map coordinates -> screen pixels using the IMAGE bounding box.
// This accounts for offsets/padding inside the map container and keeps
// heatmap aligned with the actual displayed image.
function mapToScreenUsingImage(x,y){
  if(!mapImg) return mapToScreen(x,y,mapEl)

  const imgRect = mapImg.getBoundingClientRect()
  const containerRect = mapEl.getBoundingClientRect()

  const scaleX = imgRect.width / (typeof MAP_WIDTH !== 'undefined' ? MAP_WIDTH : 1)
  const scaleY = imgRect.height / (typeof MAP_HEIGHT !== 'undefined' ? MAP_HEIGHT : 1)

  const offsetX = imgRect.left - containerRect.left
  const offsetY = imgRect.top - containerRect.top

  return {
    x: Math.round(x * scaleX + offsetX),
    y: Math.round(y * scaleY + offsetY)
  }
}

window.addEventListener('resize', ()=>{
  if(heatmap && heatmap._renderer && typeof heatmap._renderer.setDimensions === 'function'){
    heatmap._renderer.setDimensions(Math.max(1, heatLayer.clientWidth), Math.max(1, heatLayer.clientHeight))
  }
})

let heatPoints = []
let rankingMap = {}
let isAdmin = false

function checkAdmin(){
  return fetch('/api/admin/check',{ credentials: 'same-origin' })
    .then(r=>r.json())
    .then(d=>{ isAdmin = !!d.logged }).catch(()=>{ isAdmin = false })
}

function fetchNavbar(){
  fetch('/components/navbar.html')
    .then(r=>r.text())
    .then(html=>{
      document.getElementById('navbar').innerHTML = html
      if(window.markActiveNav) window.markActiveNav()
      else setTimeout(()=>{ if(window.markActiveNav) window.markActiveNav() },200)
      if(window.adjustNavbarAuth) window.adjustNavbarAuth()
      else setTimeout(()=>{ if(window.adjustNavbarAuth) window.adjustNavbarAuth() },200)
    })
}

function formatTimestamp(ts){
  if(!ts) return 'never'
  // simple formatting: return raw string or ISO
  return ts
}

const markerLayer = document.getElementById('markerLayer')

function clearMarkers(){
  if(markerLayer) markerLayer.innerHTML = ''
  else document.querySelectorAll('.marker').forEach(m=>m.remove())
}

function showTooltip(text, clientX, clientY){
  tooltip.innerText = text
  tooltip.style.display = 'block'
  // small offset
  const pad = 10
  tooltip.style.left = (clientX + pad) + 'px'
  tooltip.style.top = (clientY + pad) + 'px'
}

function hideTooltip(){
  tooltip.style.display = 'none'
}

function updateStatus(){
  return fetch('/api/status')
    .then(r=>r.json())
    .then(bins=>{
      clearMarkers()

      bins.forEach(b=>{
  const screen = mapToScreenUsingImage(b.x,b.y)

        let marker = document.createElement('div')
        marker.className = 'marker'
        marker.style.left = screen.x + 'px'
        marker.style.top = screen.y + 'px'

        const minutes = (Date.now() - new Date(b.last)) / 60000

        if(minutes > 90) marker.classList.add('red')
        else if(minutes > 45) marker.classList.add('orange')
        else marker.classList.add('green')

        // data attributes
        marker.dataset.binId = b.id
        marker.dataset.last = b.last || ''
        marker.dataset.clientX = screen.x
        marker.dataset.clientY = screen.y

        const empties = rankingMap[b.id] || 0
        marker.dataset.empties = empties

        // hover popup handlers
        marker.style.pointerEvents = 'auto' // enable hover/click on marker even if parent layer defaults to none
        marker.addEventListener('mouseenter', (ev)=>{
          const id = ev.currentTarget.dataset.binId
          const last = ev.currentTarget.dataset.last
          const empt = ev.currentTarget.dataset.empties

          const txt = `Bin ${id}\nLast: ${formatTimestamp(last)}\nEmpties: ${empt}`
          // position near marker: compute marker's rect
          const rect = ev.currentTarget.getBoundingClientRect()
          showTooltip(txt, rect.right, rect.top)

          // also create a small inline hover label showing only the bin id
          try{
            // remove existing label if any
            if(ev.currentTarget._hoverLabel){ ev.currentTarget._hoverLabel.remove(); ev.currentTarget._hoverLabel = null }
            const label = document.createElement('div')
            label.className = 'hover-label'
            label.innerText = `#${id}`
            // position relative to marker layer using stored dataset client coords
            const cx = Number(ev.currentTarget.dataset.clientX) || rect.left
            const cy = Number(ev.currentTarget.dataset.clientY) || rect.top
            label.style.position = 'absolute'
            label.style.left = (cx + 12) + 'px'
            label.style.top = (cy - 10) + 'px'
            label.style.zIndex = 5
            // attach to markerLayer if available
            if(typeof markerLayer !== 'undefined' && markerLayer) markerLayer.appendChild(label)
            else document.body.appendChild(label)
            ev.currentTarget._hoverLabel = label
          }catch(e){/* ignore */}
        })

        marker.addEventListener('mouseleave', (ev)=>{
          hideTooltip()
          try{ if(ev.currentTarget._hoverLabel){ ev.currentTarget._hoverLabel.remove(); ev.currentTarget._hoverLabel = null } }catch(e){}
        })

        if(markerLayer) markerLayer.appendChild(marker)
        else mapEl.appendChild(marker)
      })
    })
}

function updateHeatmap(){
  return fetch('/api/heatmap')
    .then(r=>r.json())
    .then(data=>{
      // ensure heatmap exists and is sized
      createHeatmap()

      heatPoints = data.map(p=>{
        const screen = mapToScreenUsingImage(p.x,p.y)
        return { x: screen.x, y: screen.y, value: p.value }
      })

      if(heatmap){
        heatmap.setData({
          max: Math.max(10, ...heatPoints.map(p=>p.value)),
          data: heatPoints
        })
      }

      // optional debug: draw small dots for each heat point when ?debug=1
      try{
        const params = new URLSearchParams(window.location.search)
        if(params.get('debug') === '1'){
          // remove previous debug dots
          document.querySelectorAll('.debug-dot').forEach(d=>d.remove())
          heatPoints.forEach(p=>{
            const d = document.createElement('div')
            d.className = 'debug-dot'
            d.style.position = 'absolute'
            d.style.left = (p.x)+'px'
            d.style.top = (p.y)+'px'
            d.style.width = '6px'
            d.style.height = '6px'
            d.style.borderRadius = '50%'
            d.style.background = 'rgba(255,0,0,0.8)'
            d.style.zIndex = 4
            if(markerLayer) markerLayer.appendChild(d)
            else mapEl.appendChild(d)
          })
        }
      }catch(e){/* ignore */}
    })
}

function updateActivity(){
  return fetch('/api/activity')
    .then(r=>r.json())
    .then(data=>{
      const div = document.getElementById('activity')
      div.innerHTML = ''

      data.forEach(a=>{
        let row = document.createElement('div')
        const user = isAdmin ? a.username : '*****'
        row.innerText = `${user} -> Bin ${a.bin_id} (${a.timestamp})`
        div.appendChild(row)
      })
    })
}

function updateRanking(){
  return fetch('/api/ranking')
    .then(r=>r.json())
    .then(data=>{
      const div = document.getElementById('ranking')
      div.innerHTML = ''

      rankingMap = {}

      data.forEach(b=>{ rankingMap[b.bin_id] = b.total })

      data.slice(0,10).forEach(b=>{
        let row = document.createElement('div')
        row.innerText = `Bin ${b.bin_id} : ${b.total} empties`
        div.appendChild(row)
      })
    })
}

function refresh(){
  // ensure we know admin status before rendering activity
  checkAdmin()
    .then(()=> updateRanking())
    .then(()=> Promise.all([
      updateHeatmap(),
      updateStatus(),
      updateActivity()
    ]))
}

// heatmap hover: show value for nearest point
let heatHoverThreshold = 40 // px

function handleHeatMouseMove(ev){
  const rect = heatLayer.getBoundingClientRect()
  const x = ev.clientX - rect.left
  const y = ev.clientY - rect.top

  if(!heatPoints || heatPoints.length === 0){ hideTooltip(); return }

  let nearest = null
  let bestDist = Infinity

  for(const p of heatPoints){
    const dx = p.x - x
    const dy = p.y - y
    const d2 = dx*dx + dy*dy
    if(d2 < bestDist){ bestDist = d2; nearest = p }
  }

  if(nearest && Math.sqrt(bestDist) <= heatHoverThreshold){
    showTooltip(`Heat: ${nearest.value}`, ev.clientX, ev.clientY)
  } else {
    hideTooltip()
  }
}

if(heatLayer) heatLayer.addEventListener('mousemove', handleHeatMouseMove)
if(markerLayer) markerLayer.addEventListener('mousemove', handleHeatMouseMove)

if(heatLayer) heatLayer.addEventListener('mouseleave', ()=>{ hideTooltip() })
if(markerLayer) markerLayer.addEventListener('mouseleave', ()=>{ hideTooltip() })

// initialize
fetchNavbar()
refresh()
setInterval(refresh, 5000)

// expose refresh for debugging
window.__dashboard_refresh = refresh
