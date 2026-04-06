// Very small service worker: caches core assets and serves from cache first
const CACHE_NAME = 'trash-heatmap-v1'
const CORE_ASSETS = [
  '/',
  '/dashboard.html',
  '/index.html',
  '/css/style.css',
  '/js/site.js',
  '/js/dashboard.js'
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(()=>{}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // only handle GET requests
  if(req.method !== 'GET') return
  event.respondWith(
    caches.match(req).then(resp => {
      return resp || fetch(req).then(fetchResp => {
        // optionally cache fetched resources (no opaque caching here)
        try{
          const cloned = fetchResp.clone()
          caches.open(CACHE_NAME).then(cache=>{
            cache.put(req, cloned)
          })
        }catch(e){}
        return fetchResp
      }).catch(()=> caches.match('/dashboard.html'))
    })
  )
})
