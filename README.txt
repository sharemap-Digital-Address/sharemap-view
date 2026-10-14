# ShareMap Split-View Finder — GitHub Pages files

## Files
- `index.html` — main app.
- `openlocationcode.js` — local Plus Code engine (no CDN dependency for Plus Code conversion).
- `location-search.js` — local reference-centre lookup plus online Nominatim fallback.
- `world-centers.json` — starter reference-centre list. It is **not** a complete world gazetteer.

## Publish on GitHub Pages
1. Upload all four files into the same repository folder (the root folder if Pages serves `/`).
2. Ensure the main file is named exactly `index.html`.
3. Commit the changes and wait for GitHub Pages to publish.
4. Open the live site in Chrome and reload it.

## Important
- Full Plus Codes can be decoded locally by the bundled engine.
- Short codes such as `WHRV+69` need reference coordinates. If the input includes a place name, the app first checks `world-centers.json`, then attempts online lookup through Nominatim.
- The starter JSON contains a few example city centres only; it is not a complete world database. Online lookup is needed for other place names.
- Map tiles, reverse geocoding, and Street View still require internet and use third-party services.
- Do not use the map's old/default pin as proof of successful conversion: check the status message and the displayed code/coordinates.
