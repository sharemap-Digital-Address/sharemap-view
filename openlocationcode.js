/* Open Location Code compatible browser API.
 * Pair-code implementation with encode/decode/validation/short-code recovery.
 * Uses the official OLC alphabet and grid resolutions; no CDN required.
 */
(function (root) {
  "use strict";
  const ALPHABET = "23456789CFGHJMPQRVWX";
  const SEPARATOR = "+";
  const SEPARATOR_POSITION = 8;
  const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];
  const GRID_ROWS = 5, GRID_COLUMNS = 4, GRID_SIZE = 0.000125;

  function normalize(code) {
    return String(code || "").toUpperCase().replace(/\s+/g, "");
  }
  function isValid(code) {
    code = normalize(code);
    if (!code || (code.match(/\+/g) || []).length !== 1) return false;
    const sep = code.indexOf("+");
    if (sep > SEPARATOR_POSITION || sep % 2 !== 0 || sep === 0) return false;
    if (sep === SEPARATOR_POSITION && code.length < SEPARATOR_POSITION + 2) return false;
    if (sep < SEPARATOR_POSITION && (code.length < sep + 3 || code.length > SEPARATOR_POSITION + 1)) return false;
    const body = code.replace("+", "");
    if (!/^[23456789CFGHJMPQRVWX0]+$/.test(body)) return false;
    if (body.includes("0")) {
      const firstZero = body.indexOf("0");
      if (sep !== SEPARATOR_POSITION || firstZero < 2 || firstZero % 2 !== 0 ||
          !/^([23456789CFGHJMPQRVWX]{2}){0,3}0+$/.test(body)) return false;
    }
    if (body.replace(/0/g, "").length < 2) return false;
    return true;
  }
  function isShort(code) {
    code = normalize(code);
    return isValid(code) && code.indexOf("+") < SEPARATOR_POSITION;
  }
  function isFull(code) {
    code = normalize(code);
    if (!isValid(code)) return false;
    if (isShort(code)) return false;
    const first = ALPHABET.indexOf(code[0]);
    return first >= 0 && first < 9;
  }
  function encode(latitude, longitude, codeLength) {
    codeLength = codeLength || 10;
    if (codeLength < 2 || (codeLength < 10 && codeLength % 2) || codeLength > 15) {
      throw new Error("Invalid Plus Code length.");
    }
    latitude = Number(latitude); longitude = Number(longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error("Latitude/longitude out of range.");
    }
    latitude = Math.min(90 - 1e-12, latitude);
    longitude = ((longitude + 180) % 360 + 360) % 360;
    latitude += 90;
    let code = "", lat = latitude, lng = longitude;
    const pairLength = Math.min(codeLength, 10);
    for (let i = 0; i < pairLength / 2; i++) {
      const res = PAIR_RESOLUTIONS[i];
      const latDigit = Math.floor(lat / res);
      const lngDigit = Math.floor(lng / res);
      code += ALPHABET.charAt(Math.min(19, latDigit)) + ALPHABET.charAt(Math.min(19, lngDigit));
      lat -= latDigit * res; lng -= lngDigit * res;
    }
    if (codeLength > 10) {
      let latRes = PAIR_RESOLUTIONS[4], lngRes = PAIR_RESOLUTIONS[4];
      for (let i = 10; i < codeLength; i++) {
        latRes /= GRID_ROWS; lngRes /= GRID_COLUMNS;
        const row = Math.floor(lat / latRes);
        const col = Math.floor(lng / lngRes);
        code += ALPHABET.charAt(Math.min(19, row * GRID_COLUMNS + col));
        lat -= row * latRes; lng -= col * lngRes;
      }
    }
    return code.slice(0, 8) + "+" + code.slice(8);
  }
  function decode(code) {
    code = normalize(code);
    if (!isValid(code) || isShort(code)) throw new Error("A full valid Plus Code is required.");
    const body = code.replace("+", "").replace(/0+$/, "");
    let south = -90, west = -180;
    let latRes = 20, lngRes = 20;
    const pairChars = Math.min(body.length, 10);
    for (let i = 0; i < pairChars; i += 2) {
      const res = PAIR_RESOLUTIONS[i / 2];
      south += ALPHABET.indexOf(body[i]) * res;
      west += ALPHABET.indexOf(body[i + 1]) * res;
      latRes = res; lngRes = res;
    }
    let north = south + latRes, east = west + lngRes;
    if (body.length > 10) {
      let rowRes = PAIR_RESOLUTIONS[4] / GRID_ROWS;
      let colRes = PAIR_RESOLUTIONS[4] / GRID_COLUMNS;
      for (let i = 10; i < body.length; i++) {
        const digit = ALPHABET.indexOf(body[i]);
        const row = Math.floor(digit / GRID_COLUMNS);
        const col = digit % GRID_COLUMNS;
        south += row * rowRes; west += col * colRes;
        latRes = rowRes; lngRes = colRes;
        north = south + latRes; east = west + lngRes;
        rowRes /= GRID_ROWS; colRes /= GRID_COLUMNS;
      }
    }
    return {
      latitudeLo: south, longitudeLo: west,
      latitudeHi: north, longitudeHi: east,
      latitudeCenter: (south + north) / 2,
      longitudeCenter: (west + east) / 2,
      codeLength: body.length
    };
  }
  function recoverNearest(shortCode, referenceLatitude, referenceLongitude) {
    shortCode = normalize(shortCode);
    if (!isValid(shortCode) || !isShort(shortCode)) throw new Error("Invalid short Plus Code.");
    const sep = shortCode.indexOf("+");
    const missing = SEPARATOR_POSITION - sep;
    const resolution = Math.pow(20, 2 - missing / 2);
    const refCode = encode(referenceLatitude, referenceLongitude, 10).replace("+", "");
    let recovered = (refCode.slice(0, missing) + shortCode.replace("+", ""));
    recovered = recovered.slice(0, 8) + "+" + recovered.slice(8);
    let area = decode(recovered);
    let lat = area.latitudeCenter, lng = area.longitudeCenter;
    if (referenceLatitude + resolution / 2 < lat && lat - referenceLatitude > resolution / 2) lat -= resolution;
    else if (referenceLatitude - resolution / 2 > lat && referenceLatitude - lat > resolution / 2) lat += resolution;
    if (referenceLongitude + resolution / 2 < lng && lng - referenceLongitude > resolution / 2) lng -= resolution;
    else if (referenceLongitude - resolution / 2 > lng && referenceLongitude - lng > resolution / 2) lng += resolution;
    return encode(lat, lng, Math.max(10, recovered.replace("+", "").length));
  }
  const api = { encode, decode, isValid, isShort, isFull, recoverNearest, CODE_ALPHABET: ALPHABET };
  root.OpenLocationCode = api;
  root.openLocationCode = api;
})(typeof window !== "undefined" ? window : globalThis);
