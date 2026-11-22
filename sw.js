const CACHE_NAME="alan-cobros-shell-v2";
const APP_SHELL=["./","./index.html","./offline-sync.js","./manifest.webmanifest","./icons/alan-192.svg","./icons/alan-512.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(url.pathname.includes("/auth/")||url.pathname.includes("/rest/")||url.pathname.includes("/realtime/"))return;
 if(request.mode==="navigate"){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put("./index.html",copy));}
   return response;
  }).catch(()=>caches.match("./index.html").then(cached=>cached||caches.match("./"))));
  return;
 }
 event.respondWith(caches.match(request).then(cached=>{
  const network=fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
   return response;
  });
  return cached||network.catch(()=>caches.match("./"));
 }));
});
self.addEventListener("push",event=>{
 let data={title:"ALAN · Control de Cobros",body:"Tienes una actualización en tu proyecto.",url:"./"};
 try{if(event.data)data={...data,...event.data.json()};}catch(_){if(event.data)data.body=event.data.text();}
 event.waitUntil(self.registration.showNotification(data.title||"ALAN",{
  body:data.body||"Hay una actualización.",
  icon:"./icons/alan-192.svg",
  badge:"./icons/alan-192.svg",
  data:{url:data.url||"./"},
  tag:data.tag||"alan-update",
  renotify:true
 }));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=new URL((event.notification.data&&event.notification.data.url)||"./",self.location.origin).href;
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{
  for(const client of clients){if("focus" in client){client.navigate(target);return client.focus();}}
  if(self.clients.openWindow)return self.clients.openWindow(target);
 }));
});
