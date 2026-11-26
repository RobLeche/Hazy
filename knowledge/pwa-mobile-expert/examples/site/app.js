// Page script: register SW, render forecast with "updated" stamp, handle alerts offline, install prompt.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");

async function load() {
  const f = document.getElementById("forecast");
  try {
    const res = await fetch("/api/forecast?lat=27.95&lon=-82.46");
    const data = await res.json();
    f.textContent = data.offline ? "Offline and no saved forecast yet." : `${data.headline} (updated ${data.updated})`;
  } catch { f.textContent = "Couldn't load the forecast."; }
  const a = document.getElementById("alerts");
  try {
    const res = await fetch("/api/alerts?lat=27.95&lon=-82.46");
    const data = await res.json();
    a.textContent = data.length ? data[0].event : "No active alerts.";
  } catch { a.textContent = "Can't check alerts offline."; }
}
load();

// Example 3 — Custom install button (Chromium: beforeinstallprompt). iOS has no prompt API: show a hint instead.
let deferred = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  document.getElementById("install").hidden = false;
});
document.getElementById("install").addEventListener("click", async () => {
  if (!deferred) return;
  deferred.prompt();                       // may be called only once per event (web.dev)
  const { outcome } = await deferred.userChoice;
  window.__installOutcome = outcome;
  deferred = null;
  document.getElementById("install").hidden = true;
});
window.addEventListener("appinstalled", () => { document.getElementById("install").hidden = true; });
