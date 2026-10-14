/* Local-first reference lookup with Nominatim online fallback. */
(function () {
  "use strict";
  let localLocations = [];
  async function loadLocalCenters() {
    if (localLocations.length) return localLocations;
    try {
      const r = await fetch("./world-centers.json", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();
      localLocations = Array.isArray(data.locations) ? data.locations : [];
    } catch (e) {
      console.warn("Local world-centers.json unavailable:", e);
      localLocations = [];
    }
    return localLocations;
  }
  function normalize(s) {
    return String(s || "").toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[.,]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  async function findReferenceLocation(query) {
    const q = String(query || "").trim();
    if (!q) throw new Error("Maglagay ng reference place, halimbawa: Lucena City, Quezon.");
    const locations = await loadLocalCenters();
    const nq = normalize(q);
    let found = locations.find(p => normalize(p.name) === nq ||
      (p.aliases || []).some(a => normalize(a) === nq));
    if (!found) found = locations.find(p =>
      normalize(p.name).includes(nq) || nq.includes(normalize(p.name)) ||
      (p.aliases || []).some(a => normalize(a).includes(nq) || nq.includes(normalize(a))));
    if (found) return { lat: Number(found.lat), lng: Number(found.lng), label: found.name, source: "local" };

    // Online fallback: required for place names not included in the starter JSON.
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
      encodeURIComponent(q);
    const response = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error("Hindi ma-access ang online place search (HTTP " + response.status + ").");
    const results = await response.json();
    if (!results.length) throw new Error("Hindi makita ang reference place: " + q);
    return {
      lat: Number(results[0].lat),
      lng: Number(results[0].lon),
      label: results[0].display_name || q,
      source: "online"
    };
  }
  window.ShareMapLocationSearch = { loadLocalCenters, findReferenceLocation };
})();