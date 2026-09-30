// AstrogameWAR — Android geri tusu / tarayici gecmisi
// Capacitor App eklentisi yoksa history API kullanilir.

export function pushLayer(name) {
  try {
    history.pushState({ astro: name }, "");
  } catch {}
}

export function onBack(handler) {
  const fn = () => handler();
  window.addEventListener("popstate", fn);
  return () => window.removeEventListener("popstate", fn);
}
