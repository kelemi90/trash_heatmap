// Dashboard client logic moved out of HTML
// Globally prefer willReadFrequently for 2D contexts to avoid
// repeated getImageData warnings in browsers when libraries read pixels.
// We keep a safe guard so we don't override multiple times.
try{
  if(typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.__getContextPatched){
    const _origGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, opts){
      try{
        if(type === '2d') opts = Object.assign({}, opts, { willReadFrequently: true })
      }catch(e){}
      return _origGetContext.call(this, type, opts)
    }
    HTMLCanvasElement.prototype.__getContextPatched = true
  }
}catch(e){}

const mapEl = document.getElementById('map')
const heatLayer = document.getElementById('heatLayer')
const tooltip = document.getElementById('tooltip')

// heatmap instance (created after image load so sizing is correct)
let heatmap = null

// UI controls (may be null if controls not present)
const heatRangeEl = document.getElementById('heatRange')
const heatRadiusEl = document.getElementById('heatRadius')
const heatRadiusVal = document.getElementById('heatRadiusVal')
const heatRefreshBtn = document.getElementById('heatRefresh')

function createHeatmap(){
  if(heatmap) return heatmap
  // determine radius from control when available
  let radius = 40
  try{
    if(heatRadiusEl) radius = Math.max(10, Math.min(200, parseInt(heatRadiusEl.value,10) || 40))
  }catch(e){}
  // ensure overlay matches image size before creating canvas
  try{ ensureHeatLayerSized() }catch(e){}

  // remove any existing heatmap canvases so recreating doesn't stack multiple
  try{
    Array.from(heatLayer.querySelectorAll('canvas')).forEach(c => c.remove())
  }catch(e){}

  // Some browsers warn when getImageData is called frequently unless the
  // canvas 2D context was created with { willReadFrequently: true }.
  // heatmap.js creates its own canvas/context internally, so we temporarily
  // monkey-patch HTMLCanvasElement.getContext to force that option during
  // creation. We restore the original afterwards.
  try{
    const origGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, opts){
      try{
        if(type === '2d'){
          opts = Object.assign({}, opts, { willReadFrequently: true })
        }
      }catch(e){}
      return origGetContext.call(this, type, opts)
    }
    heatmap = h337.create({ container: heatLayer, radius: radius })
    // restore
    HTMLCanvasElement.prototype.getContext = origGetContext
  }catch(e){
    // fallback: just create normally
    try{ heatmap = h337.create({ container: heatLayer, radius: radius }) }catch(_){ heatmap = null }
  }
  // ensure renderer dimensions match the container (heatmap.js internal API)
  try{
    const w = Math.max(1, heatLayer.clientWidth)
    const h = Math.max(1, heatLayer.clientHeight)
    if(heatmap._renderer && typeof heatmap._renderer.setDimensions === 'function'){
      heatmap._renderer.setDimensions(w,h)
    }
    // Ensure heatLayer matches the displayed image size (some layouts report 0/1px height)
    try{
      if(mapImg){
        const imgRect = mapImg.getBoundingClientRect()
        heatLayer.style.position = 'absolute'
        heatLayer.style.left = '0px'
        heatLayer.style.top = '0px'
        heatLayer.style.width = imgRect.width + 'px'
        heatLayer.style.height = imgRect.height + 'px'
        // ensure markerLayer matches as well
        if(typeof markerLayer !== 'undefined' && markerLayer){
          markerLayer.style.position = 'absolute'
          markerLayer.style.left = '0px'
          markerLayer.style.top = '0px'
          markerLayer.style.width = imgRect.width + 'px'
          markerLayer.style.height = imgRect.height + 'px'
        }
      }
    }catch(e){}
    // Ensure the heatmap canvas sits exactly over the image and doesn't capture pointer events.
    try{
      Array.from(heatLayer.querySelectorAll('canvas')).forEach(c => {
        c.style.position = 'absolute'
        c.style.top = '0'
        c.style.left = '0'
        c.style.width = '100%'
        c.style.height = '100%'
        c.style.pointerEvents = 'none'
        c.style.zIndex = 2
        // move canvas to be the first child of heatLayer so it sits below markers but above image
        if(c.parentElement === heatLayer) heatLayer.insertBefore(c, heatLayer.firstChild)
      })
    }catch(e){}
    // Try to create the 2D context with willReadFrequently to avoid
    // browser warnings when heatmap later calls getImageData.
    try{
      Array.from(heatLayer.querySelectorAll('canvas')).forEach(c => {
        try{
          c.getContext && c.getContext('2d', { willReadFrequently: true })
        }catch(e){/* ignore; some browsers ignore options if context exists */}
      })
    }catch(e){}
  }catch(e){ console.warn('heatmap resize failed',e) }
  return heatmap
}

// Ensure heatLayer and the heatmap canvas match the displayed image size.
// Retries a few times if layout hasn't settled (useful on slow image loads or responsive shifts).
function ensureHeatLayerSized(retries = 6){
  try{
    if(!mapImg || !heatLayer) return
    const imgRect = mapImg.getBoundingClientRect()
    // If image has no height yet, retry shortly
    if(imgRect.height <= 2 && retries > 0){
      setTimeout(()=> ensureHeatLayerSized(retries - 1), 200)
      return
    }

    heatLayer.style.position = 'absolute'
    heatLayer.style.left = '0px'
    heatLayer.style.top = '0px'
    heatLayer.style.width = imgRect.width + 'px'
    heatLayer.style.height = imgRect.height + 'px'

    if(typeof markerLayer !== 'undefined' && markerLayer){
      markerLayer.style.position = 'absolute'
      markerLayer.style.left = '0px'
      markerLayer.style.top = '0px'
      markerLayer.style.width = imgRect.width + 'px'
      markerLayer.style.height = imgRect.height + 'px'
    }

    // Resize heatmap renderer if present
    if(heatmap && heatmap._renderer && typeof heatmap._renderer.setDimensions === 'function'){
      const w = Math.max(1, heatLayer.clientWidth)
      const h = Math.max(1, heatLayer.clientHeight)
      heatmap._renderer.setDimensions(w,h)
    }

    // fix canvas styles (ensure full-cover and non-interactive)
    try{
      Array.from(heatLayer.querySelectorAll('canvas')).forEach(c => {
        c.style.position = 'absolute'
        c.style.top = '0'
        c.style.left = '0'
        c.style.width = '100%'
        c.style.height = '100%'
        c.style.pointerEvents = 'none'
        c.style.zIndex = 2
        if(c.parentElement === heatLayer) heatLayer.insertBefore(c, heatLayer.firstChild)
      })
    }catch(e){}

    // if height still tiny, retry a couple more times
    if(heatLayer.clientHeight <= 2 && retries > 0){
      setTimeout(()=> ensureHeatLayerSized(retries - 1), 300)
    }
  }catch(e){
    if(retries > 0) setTimeout(()=> ensureHeatLayerSized(retries - 1), 200)
  }
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
  // skip bins that don't have a valid placement (often stored as 0/0)
  if((b.x === null || typeof b.x === 'undefined' || b.x === 0) && (b.y === null || typeof b.y === 'undefined' || b.y === 0)){
    return // nothing to render for unplaced bins
  }
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
  // include selected range when available
  let url = '/api/heatmap'
  try{
    if(heatRangeEl && heatRangeEl.value && heatRangeEl.value !== 'all'){
      const v = encodeURIComponent(heatRangeEl.value)
      url += '?range=' + v
    }
  }catch(e){}

  return fetch(url)
    .then(r=>r.json())
    .then(data=>{
      // ensure heatmap exists and is sized
      createHeatmap()

      // Map heat data to screen coordinates but filter out invalid/unplaced
      // bins (commonly stored as 0/0) so no heat appears at the map origin.
      heatPoints = []
      data.forEach(p=>{
        if(!p) return
        // treat missing or zero coordinates as unplaced
        const missingX = (p.x === null || typeof p.x === 'undefined' || Number(p.x) === 0)
        const missingY = (p.y === null || typeof p.y === 'undefined' || Number(p.y) === 0)
        if(missingX && missingY) return
        const screen = mapToScreenUsingImage(p.x,p.y)
        if(!isFinite(screen.x) || !isFinite(screen.y)) return
        // ignore points outside the visible image area (optional safety)
        if(screen.x < 1 || screen.y < 1) return
        heatPoints.push({ x: Math.round(screen.x), y: Math.round(screen.y), value: p.value })
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

// wire control events if they exist
try{
  if(heatRadiusEl){
    heatRadiusEl.addEventListener('input', ()=>{
      if(heatRadiusVal) heatRadiusVal.innerText = heatRadiusEl.value
      // recreate heatmap renderer with new radius
      heatmap = null
      createHeatmap()
      updateHeatmap()
    })
    // initialize display value
    if(heatRadiusVal) heatRadiusVal.innerText = heatRadiusEl.value
  }

  if(heatRefreshBtn){
    heatRefreshBtn.addEventListener('click', ()=>{ refresh() })
  }

  if(heatRangeEl){
    heatRangeEl.addEventListener('change', ()=>{ refresh() })
  }
}catch(e){/* ignore wiring errors */}

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

// Improve hover behavior: prefer showing bin id (easier to read on mouse and touch)
// and avoid showing the generic "Heat: <number>" tooltip which can obscure bin labels.
function handleHeatMouseMove(ev){
  const rect = heatLayer.getBoundingClientRect()
  const x = ev.clientX - rect.left
  const y = ev.clientY - rect.top

  // Try to find a nearby marker first (prefer bin id)
  try{
    if(markerLayer){
      let nearestMarker = null
      let bestDist = Infinity
      Array.from(markerLayer.querySelectorAll('.marker')).forEach(m=>{
        const mx = Number(m.dataset.clientX) || 0
        const my = Number(m.dataset.clientY) || 0
        const dx = mx - x
        const dy = my - y
        const d2 = dx*dx + dy*dy
        if(d2 < bestDist){ bestDist = d2; nearestMarker = m }
      })

      if(nearestMarker && Math.sqrt(bestDist) <= heatHoverThreshold){
        // show only the bin id to keep the UI clean
        const id = nearestMarker.dataset && nearestMarker.dataset.binId ? nearestMarker.dataset.binId : null
        if(id){ showTooltip(`#${id}`, ev.clientX, ev.clientY); return }
      }
    }
  }catch(e){/* ignore marker parsing errors */}

  // If no nearby marker, don't show the generic heat tooltip (it can be distracting)
  hideTooltip()
}

// Touch support: on touchstart show nearest bin id briefly so mobile users can tap to see bin number
let _touchTooltipPersistent = false
function handleHeatTouchStart(ev){
  if(!ev.touches || ev.touches.length === 0) return
  const t = ev.touches[0]
  // reuse mouse move logic by creating a synthetic event-like object
  const synth = { clientX: t.clientX, clientY: t.clientY }

  // If a persistent tooltip is already shown, hide it and clear persistence.
  if(_touchTooltipPersistent){
    hideTooltip()
    _touchTooltipPersistent = false
    // allow event to propagate (we handled the hide)
    return
  }

  // Show tooltip and keep it persistent until the next tap anywhere.
  handleHeatMouseMove(synth)
  _touchTooltipPersistent = true

  // prevent the document-level handler from immediately clearing the tooltip
  try{ ev.stopPropagation && ev.stopPropagation() }catch(e){}
}

function handleHeatTouchEnd(){
  // do nothing: persistence is controlled by taps, not touchend
}

if(heatLayer) heatLayer.addEventListener('mousemove', handleHeatMouseMove)
if(markerLayer) markerLayer.addEventListener('mousemove', handleHeatMouseMove)

if(heatLayer) heatLayer.addEventListener('mouseleave', ()=>{ hideTooltip() })
if(markerLayer) markerLayer.addEventListener('mouseleave', ()=>{ hideTooltip() })

if(heatLayer) heatLayer.addEventListener('touchstart', handleHeatTouchStart, { passive: true })
if(markerLayer) markerLayer.addEventListener('touchstart', handleHeatTouchStart, { passive: true })
if(heatLayer) heatLayer.addEventListener('touchend', handleHeatTouchEnd)
if(markerLayer) markerLayer.addEventListener('touchend', handleHeatTouchEnd)

// Document-level touch handler: when a persistent tooltip is shown, any
// subsequent tap (outside the heatLayer/marker) should hide it. We use a
// capture listener so it runs before other bubble listeners.
document.addEventListener('touchstart', function(ev){
  if(!_touchTooltipPersistent) return
  // If the touch started inside the heat or marker layers, let the layer
  // handlers manage showing/hiding. If it started elsewhere, hide.
  const touch = ev.touches && ev.touches[0]
  if(!touch) return
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  if(!el) return
  if(heatLayer && (heatLayer === el || heatLayer.contains(el))) return
  if(markerLayer && (markerLayer === el || markerLayer.contains(el))) return

  // hide tooltip and clear persistence
  hideTooltip()
  _touchTooltipPersistent = false
}, { capture: true, passive: true })

// initialize
fetchNavbar()
refresh()
setInterval(refresh, 5000)

// expose refresh for debugging
window.__dashboard_refresh = refresh
