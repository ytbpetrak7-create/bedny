const SteamUser = require("steam-user");
const TradeOfferManager = require("steam-tradeoffer-manager");
const SteamCommunity = require("steamcommunity");
const SteamTotp = require("steam-totp");
const https = require("https");
const fs = require("fs");
const zlib = require("zlib");
const readline = require("readline");

const GAS_URL = "https://script.google.com/macros/s/AKfycbz89Ud1exW-1dpUuyuO1q23upXGWEf7C5ydVBEOz3M8yDB-ZlU3GGMP8bWPqUGveq3c5Q/exec";

// ===== Denní aktualizace cen =====
// Zdroj: "skinport" = ceny ze Skinportu (vychazi ze Steamu, jeden dotaz, bez limitu)
//        "steam"    = primi dotazy na Steam Market (presna cena, ale Steam casto vraci 429)
// Lze prepsat pres env: PRICE_SOURCE / PRICE_UPDATE_HOUR
const PRICE_SOURCE = process.env.PRICE_SOURCE || "skinport";
const PRICE_CURRENCY = process.env.PRICE_CURRENCY || "CZK";
const PRICE_UPDATE_HOUR = parseInt(process.env.PRICE_UPDATE_HOUR || "3", 10);
const PRICE_STATE_FILE = "price-state.json";

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({ steam: client, community: community, language: "en", pollInterval: 120000, cancelTime: 43200000 });

const BOT = {
  accountName: "pet7bot1",
  password: "Petronel7",
  sharedSecret: "",
  identitySecret: ""
};
try {
  const cfg = JSON.parse(fs.readFileSync("bot-config.json", "utf8"));
  if (cfg.sharedSecret) BOT.sharedSecret = cfg.sharedSecret;
  if (cfg.identitySecret) BOT.identitySecret = cfg.identitySecret;
  console.log("bot-config.json nacten");
} catch(e) { console.log("bot-config.json nenalezen - vytvor ho podle navodu (sharedSecret + identitySecret)"); }

client.on("steamGuard", (domain, callback, isEmail) => {
  const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl2.question(isEmail ? "🔐 Kód z emailu: " : "🔐 Kód z Steam app: ", (code) => {
    rl2.close();
    if (isEmail) callback(code);
    else callback(null, code);
  });
});

client.on("loggedOn", () => { 
  console.log("✅ Bot přihlášen jako steamID: " + (client.steamID ? client.steamID.getSteamID64() : "?") + " (melo by patrit k pet7bot1, ne Petrak7)"); 
  client.setPersona(SteamUser.EPersonaState.Online); 
  client.gamesPlayed(730);
});

client.on("webSession", (sessionID, cookies) => {
  console.log("✅ Web session získána");
  manager.setCookies(cookies);
  community.setCookies(cookies);
  fs.writeFileSync("cookies.json", JSON.stringify(cookies, null, 2));
  if (!fs.existsSync("sentry")) {
    try {
      var s = client.getSteam && client.getSteam().sentry;
      if (s) {
        fs.writeFileSync("sentry", s);
        console.log("📁 Sentry uloženo z webSession");
      }
    } catch(e) {}
  }
  if (!pollStarted) {
    pollStarted = true;
    console.log("▶️ Spouštím poll z webSession");
    poll();
    // Denní aktualizace cen (kontrola každých 10 minut, spustí se 1x za den)
    maybeUpdatePrices();
    setInterval(maybeUpdatePrices, 10 * 60 * 1000);
  }
});
client.on("sentry", (buffer) => { 
  try {
    fs.writeFileSync("sentry", buffer);
    console.log("📁 Sentry uloženo (" + buffer.length + " bytes)");
  } catch(e) { console.log("⚠️ Sentry save error:", e.message); }
});
client.on("error", (err) => { console.log("❌ Chyba:", err.message); if (err.eresult === 5) console.log("➡️  Zkus se na chvíli odhlásit ze Steamu v prohlížeči a pak spustit znovu"); });

manager.on("ready", () => { 
  console.log("✅ Trade manager ready"); 
  manager.getOffers({ "get_sent_offers": 1, "active_only": 1 }, (err, sent) => {
    if (err) { console.log("Pending sent check error:", err.message); }
    else {
      console.log(`⏳ Visících odeslaných nabídek: ${(sent || []).length}`);
      if ((sent || []).length >= 5) console.log("⚠️ Máš hodně visících nabídek - Steam kvůli tomu hází error 15! Zruš staré na: https://steamcommunity.com/my/tradeoffers/sent/");
    }
  });
  poll();
  autoConfirm();
});

var pollStarted = false;

function autoConfirm() {
  manager.getOffers({ confirmedNeedsConfirmation: true }, (err, sent, received) => {
    if (err) { console.log("Auto-confirm error:", err.message); return setTimeout(autoConfirm, 60000); }

    const needsConfirm = [...(sent || []), ...(received || [])];
    for (const offer of needsConfirm) {
      offer.accept((err) => {
        if (err) console.log("Auto-confirm accept error:", err.message);
        else console.log(`✅ Auto-potvrzeno: #${offer.id}`);
      });
    }
    setTimeout(autoConfirm, 60000);
  });
}

var sentry = fs.existsSync("sentry") ? fs.readFileSync("sentry") : null;

if (process.argv.includes("--prices")) {
  console.log("Režim: pouze aktualizace cen (bez přihlášení na Steam)");
  try {
    var savedCookies = JSON.parse(fs.readFileSync("cookies.json", "utf8"));
    community.setCookies(savedCookies);
    console.log("Cookies z cookies.json načteny (vyšší limit Steamu)");
  } catch(e) { console.log("Cookies nenalezeny – pojedu anonymně (větší riziko 429)"); }
  runPriceUpdate().then(function(ok) { process.exit(ok ? 0 : 1); }).catch(function(e) { console.log("❌ Ceny error: " + e.message); process.exit(1); });
} else if (BOT.sharedSecret) {
  const logOnOpts = { accountName: BOT.accountName, password: BOT.password, machineName: "bot", twoFactorCode: SteamTotp.generateAuthCode(BOT.sharedSecret) };
  if (sentry) logOnOpts.sentry = sentry;
  client.logOn(logOnOpts);
  console.log("Login s 2FA kodem z sharedSecret");
} else if (sentry) {
  client.logOn({ accountName: BOT.accountName, password: BOT.password, machineName: "bot", sentry: sentry });
} else if (process.argv.includes("--2fa")) {
  var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("🔑 Zadej kód z Steam mobile app: ", (code) => {
    rl.close();
    client.logOn({ accountName: BOT.accountName, password: BOT.password, machineName: "bot", twoFactorCode: code });
  });
} else {
  console.log("⚠️ Žádný sentry. Spusť: node bot.js --2fa");
  process.exit(1);
}

function gasGet(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects < 5) {
        return resolve(gasGet(res.headers.location, redirects + 1));
      }
      let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { console.log("GAS raw:", d.substring(0, 200)); resolve(d); } });
    }).on("error", reject);
  });
}

function gasPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const u = new URL(url);
    const options = { hostname: u.hostname, path: u.pathname + u.search, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } };
    const req = https.request(options, (res) => {
      // Apps Script po POSTu vraci 302 na googleusercontent – je potreba ho nasledovat
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location) {
        res.resume();
        var loc = res.headers.location;
        if (loc.indexOf("http") !== 0) loc = "https://" + u.hostname + loc;
        return resolve(gasGet(loc));
      }
      let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function parseTradeLink(url) {
  const m = String(url || "").match(/partner=(\d+)[&?]token=([\w-]+)/);
  return m ? { partner: m[1], token: m[2] } : null;
}

function normSkin(s) {
  return String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
}

function getInventory() {
  return new Promise((resolve, reject) => {
    manager.getInventoryContents(730, 2, true, (err, inv) => {
      if (err) return reject(err);
      resolve(inv);
    });
  });
}

function getUserInventory(steamId) {
  return new Promise((resolve, reject) => {
    const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=500`;
    function attempt(retries) {
      community.request({
        url: url,
        method: "GET",
        json: true
      }, (err, res, body) => {
        if (err) { console.log("InvFetch error:", err.message); return reject(err); }
        console.log("InvFetch: status=" + (res ? res.statusCode : "?"));
        if (res && res.statusCode === 429 && retries > 0) {
          console.log("InvFetch: rate limited, retry za 90s (" + retries + " retries left)");
          return setTimeout(() => attempt(retries - 1), 90000);
        }
        if (res && res.statusCode === 429) {
          console.log("InvFetch: rate limited, no retries left");
          return resolve({ success: false, rateLimited: true });
        }
        if (body && body.success) {
          console.log("InvFetch: assets=" + (body.assets ? Object.keys(body.assets).length : 0));
        } else {
          console.log("InvFetch: fail=" + JSON.stringify(body).substring(0, 200));
        }
        resolve(body || { success: false });
      });
    }
    attempt(3);
  });
}

var communityLoggedIn = false;

function communityLogin() {
  if (!BOT.sharedSecret || communityLoggedIn) return;
  community.login({
    accountName: BOT.accountName,
    password: BOT.password,
    twoFactorCode: SteamTotp.generateAuthCode(BOT.sharedSecret)
  }, (err) => {
    if (err) { console.log("Community login error: " + err.message); return; }
    communityLoggedIn = true;
    if (community.mobileAccessToken) {
      console.log("✅ Community login OK (mobilni potvrzeni aktivni)");
    } else {
      console.log("⚠️ Community login BEZ mobilniho tokenu - automaticka potvrzeni NEBUDOU fungovat!");
    }
  });
}

if (BOT.sharedSecret) {
  communityLogin();
  setInterval(communityLogin, 3600000);
}

var pendingConfirm = {};
var pendingConfirmLogged = {};

function confirmOffer(offerId, row) {
  if (!BOT.identitySecret) {
    pendingConfirm[row] = { offerId: offerId, at: Date.now() };
    console.log("Offer #" + offerId + " odeslan, ceka na rucni potvrzeni v mobilni app!");
    return;
  }
  community.acceptConfirmationForObject(BOT.identitySecret, offerId, (err) => {
    if (err) {
      console.log("Confirm error #" + offerId + ": " + err.message + " - zkusim znovu za 30s");
      setTimeout(() => confirmOffer(offerId, row), 30000);
    } else {
      console.log(`Offer #${offerId} potvrzen v mobilni app`);
      gasGet(GAS_URL + "?action=completeWithdrawal&row=" + row).catch(()=>{});
    }
  });
}

var pollCount = 0;
var botInvGlobal = null;

var lastWithdrawalAttempt = {};
var lastDepositAttempt = {};
var failedOffers = {};
var lastSteamCall = 0;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== Denní aktualizace cen =====

function loadPriceState() {
  try { return JSON.parse(fs.readFileSync(PRICE_STATE_FILE, "utf8")); } catch(e) { return {}; }
}
function savePriceState(s) {
  try { fs.writeFileSync(PRICE_STATE_FILE, JSON.stringify(s)); } catch(e) {}
}

async function runPriceUpdate() {
  console.log("💰 Aktualizace cen: zdroj=" + PRICE_SOURCE);

  // 1) Zjistit, které skiny máme v tabulkách
  var names;
  try {
    names = await gasGet(GAS_URL + "?action=getPriceNames");
    if (typeof names === "string") { try { names = JSON.parse(names); } catch(e) {} }
  } catch(e) {
    console.log("❌ Ceny: nepodařilo se načíst seznam skinů: " + e.message);
    return false;
  }
  if (!Array.isArray(names) || !names.length) {
    console.log("❌ Ceny: server nevrátil žádné skiny");
    return false;
  }
  console.log("💰 Skinů k aktualizaci: " + names.length);

  if (PRICE_SOURCE === "steam") {
    return runSteamPriceUpdate(names);
  }
  return runSkinportPriceUpdate(names);
}

// Hlavni zdroj: Skinport API – jeden dotaz vrati vsechny skiny v CZK.
// suggested_price vychazi ze Steam trhu a byva dostupny i pro skiny bez nabidek.
function fetchSkinportPrices() {
  return new Promise((resolve) => {
    var url = "https://api.skinport.com/v1/items?app_id=730&currency=CZK";
    var req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Encoding": "br" } }, (res) => {
      var chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        if (res.statusCode === 429) return resolve({ retry: true });
        if (res.statusCode !== 200) return resolve({ error: "HTTP " + res.statusCode });
        var buf = Buffer.concat(chunks);
        try {
          if (String(res.headers["content-encoding"] || "").indexOf("br") > -1) {
            buf = zlib.brotliDecompressSync(buf);
          }
        } catch(e) {
          return resolve({ error: "brotli: " + e.message });
        }
        try {
          var items = JSON.parse(buf.toString());
          if (!Array.isArray(items)) return resolve({ error: "neočekávaná odpověď" });
          var map = {};
          for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (!it || !it.market_hash_name) continue;
            var p = it.suggested_price;
            if (!(p > 0)) continue;
            map[it.market_hash_name.toLowerCase()] = p;
          }
          resolve({ map: map, count: items.length });
        } catch(e) {
          resolve({ error: "parse: " + e.message });
        }
      });
    });
    req.on("error", (e) => resolve({ error: e.message }));
    req.setTimeout(60000, () => { try { req.destroy(); } catch(e) {} resolve({ error: "timeout" }); });
  });
}

function splitNormName(s) {
  var wearMatch = String(s || "").match(/\(([^)]+)\)\s*$/);
  return {
    base: normName(s),
    wear: wearMatch ? wearMatch[1].trim().toLowerCase() : ""
  };
}

async function runSkinportPriceUpdate(names) {
  console.log("💰 Stahuji ceny ze Skinportu (Steam ceny, 1 dotaz)...");
  var sp = await fetchSkinportPrices();
  if (sp.retry) { console.log("⏳ Skinport 429 – zkusím později."); return false; }
  if (sp.error) { console.log("❌ Skinport: " + sp.error); return false; }
  console.log("💰 Skinport: " + sp.count + " položek, " + Object.keys(sp.map).length + " s cenou");

  // Index podle zakladu+opotrebeni (pak najde i nazvy bez "|" a s jinym formatem)
  var byBaseWear = {};
  var byBase = {};
  var key;
  for (key in sp.map) {
    var parts = splitNormName(key);
    var bw = parts.base + "|" + parts.wear;
    var price = sp.map[key];
    if (!(bw in byBaseWear) || price < byBaseWear[bw]) byBaseWear[bw] = price;
    if (!(parts.base in byBase) || price < byBase[parts.base]) byBase[parts.base] = price;
  }

  var fetched = 0, failed = 0;
  var batch = [];
  var notFoundSample = [];
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var p = sp.map[String(name).toLowerCase()];
    if (p === undefined) {
      var nm = splitNormName(name);
      var bwKey = nm.base + "|" + nm.wear;
      if (nm.wear && (bwKey in byBaseWear)) p = byBaseWear[bwKey];
      else if (nm.base in byBase) p = byBase[nm.base];
    }
    if (p > 0) {
      batch.push({ n: name, p: Math.round(p * 100) / 100 });
      fetched++;
    } else {
      failed++;
      if (notFoundSample.length < 10) notFoundSample.push(name);
    }
    if (batch.length >= 25) {
      await pushPricesToSheet(batch.splice(0), "CZK");
    }
  }
  if (batch.length) await pushPricesToSheet(batch, "CZK");

  if (notFoundSample.length) {
    console.log("❌ Nenalezeno (" + failed + "): " + notFoundSample.join(", "));
  }
  console.log("✅ Ceny hotovo: nalezeno " + fetched + "/" + names.length + ", nenalezeno " + failed);
  return fetched > 0;
}

async function runSteamPriceUpdate(names) {
  var fetched = 0, failed = 0, rateLimited = 0;
  var aborted = false;
  var batch = [];
  for (var i = 0; i < names.length; i++) {
    var r = await steamLookupWithRetry(names[i]);
    if (r && r.retry) {
      rateLimited++;
      aborted = true;
      console.log("⛔ Steam blokuje i po pauzách – přerušuji aktualizaci, zkusím později.");
      break;
    }
    if (r && r.price > 0) {
      batch.push({ n: names[i], p: r.price });
      fetched++;
    } else {
      failed++;
    }
    if (batch.length >= 25) {
      await pushPricesToSheet(batch.splice(0));
    }
    if ((i + 1) % 25 === 0) {
      console.log("💰 Ceny: " + (i + 1) + "/" + names.length + " (nalezeno " + fetched + ", chyb " + failed + ")");
    }
    await wait(4000 + Math.floor(Math.random() * 800));
  }
  if (batch.length) await pushPricesToSheet(batch);

  console.log("✅ Ceny hotovo: nalezeno " + fetched + "/" + names.length + ", chyb " + failed + ", rate limit " + rateLimited);
  return !aborted && fetched > 0;
}

function parseUsdPrice(s) {
  s = String(s || "").replace(/\s/g, "").replace(/[^0-9.,]/g, "");
  if (!s) return 0;
  if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.indexOf(",") > -1) {
    var parts = s.split(",");
    if (parts.length === 2 && parts[1].length === 2) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
  }
  var v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

function normName(s) {
  return String(s || "").toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");
}

// Najde skin na Steam Marketu podle (i nedokonalého) nazvu z tabulky.
// Pouziva search/render – vrati cenu v USD (sell_price je v centech).
// Posila se pres community.request, takze pouzije prihlasene cookies (vyssi limit).
function steamLookupPrice(name) {
  return new Promise((resolve) => {
    var wearMatch = String(name).match(/\(([^)]+)\)\s*$/);
    var wear = wearMatch ? wearMatch[1].trim() : "";
    var base = String(name).replace(/\s*\([^)]*\)\s*$/, "").trim();
    var url = "https://steamcommunity.com/market/search/render/?query=" + encodeURIComponent(base) +
      "&start=0&count=20&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=730&norender=1";

    function handle(err, res, body) {
      if (err) return resolve({ error: err.message });
      var code = res ? res.statusCode : 0;
      if (code === 429) return resolve({ retry: true });
      if (code !== 200 || !body) return resolve({ error: code });
      try {
        var results = body.results || [];
        var nb = normName(base);
        var best = null;
        for (var i = 0; i < results.length; i++) {
          var r = results[i];
          if (!r || !r.hash_name) continue;
          if (normName(r.hash_name) !== nb) continue;
          var rw = (r.hash_name.match(/\(([^)]+)\)\s*$/) || [])[1] || "";
          if (wear && rw.toLowerCase() !== wear.toLowerCase()) {
            if (!best) best = r;
            continue;
          }
          best = r;
          break;
        }
        if (!best || !(best.sell_price > 0)) return resolve({ notFound: true });
        resolve({ price: best.sell_price / 100 });
      } catch(e) { resolve({ error: "parse" }); }
    }

    try {
      community.request({ url: url, method: "GET", json: true, headers: { "Accept-Language": "en-US,en;q=0.9" } }, handle);
    } catch(e) {
      // fallback bez cookies
      var req = https.get(url, { headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0" } }, (res) => {
        var d = "";
        res.on("data", c => d += c);
        res.on("end", () => {
          var body = null;
          try { body = JSON.parse(d); } catch(e2) {}
          handle(null, res, body);
        });
      });
      req.on("error", (e) => resolve({ error: e.message }));
      req.setTimeout(20000, () => { try { req.destroy(); } catch(e2) {} resolve({ error: "timeout" }); });
    }
  });
}

// Zkusi to znovu s rostouci pauzou. Vrati { retry: true }, kdyz Steam blokuje i po vsech pokusech.
async function steamLookupWithRetry(name) {
  var waits = [0, 60000, 300000];
  for (var a = 0; a < waits.length; a++) {
    if (waits[a]) {
      console.log("⏳ Steam 429 – pauza " + Math.round(waits[a] / 1000) + " s (pokus " + (a + 1) + "/" + waits.length + ")");
      await wait(waits[a]);
    }
    var r = await steamLookupPrice(name);
    if (!r) return { error: "null" };
    if (!r.retry) return r;
  }
  return { retry: true };
}

async function pushPricesToSheet(items, currency) {
  if (!items.length) return;
  try {
    var res = await gasPost(GAS_URL + "?action=savePricesFromBot", { data: JSON.stringify(items), currency: currency || "USD" });
    if (typeof res === "string") { try { res = JSON.parse(res); } catch(e) {} }
    if (!res || typeof res !== "object") {
      console.log("❌ Uložení cen: neplatná odpověď: " + String(res).substring(0, 150));
      return;
    }
    if (res.error) { console.log("❌ Uložení cen: " + res.error); return; }
    console.log("💾 Uloženo " + (res.updated || 0) + " cen (nenalezeno " + ((res.notFound || []).length) + ")");
  } catch(e) {
    console.log("❌ Uložení cen selhalo: " + e.message);
  }
}

async function maybeUpdatePrices() {
  var st = loadPriceState();
  var now = new Date();
  var today = now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");
  if (st.lastDate === today) return;
  if (now.getHours() < PRICE_UPDATE_HOUR) return;
  // Kdyz se to nepovede (Steam 429), zkusit znovu nejdriv za hodinu
  if (st.lastAttempt && (Date.now() - st.lastAttempt) < 60 * 60 * 1000) return;
  st.lastAttempt = Date.now();
  savePriceState(st);
  var ok = false;
  try { ok = await runPriceUpdate(); } catch(e) { console.log("❌ Ceny error: " + e.message); }
  if (ok) {
    st.lastDate = today;
    savePriceState(st);
  } else {
    console.log("↩️ Ceny se nepovedly, zkusím znovu za hodinu.");
  }
}

async function poll() {
  pollCount++;
  console.log("Poll #" + pollCount + ": začátek");

  await wait(3000);

  var botInv = null;
  try {
    botInv = await getInventory();
    botInvGlobal = botInv;
    console.log("Poll: bot inventory loaded - " + botInv.length + " items");
  } catch(e) { console.error("Bot inventory error:", e.message); }

  try {
    const items = await gasGet(GAS_URL + "?action=getWithdrawals");
    
    // Načíst pending deposits - tyhle uživatele withdrawal přeskočí (oni posílají skiny botovi, neberou si je)
    const pendingDepRes = await gasGet(GAS_URL + "?action=getPendingDeposits");
    const pendingUsers = new Set();
    if (pendingDepRes) {
      const pendings = typeof pendingDepRes === "string" ? JSON.parse(pendingDepRes) : pendingDepRes;
      for (const dep of pendings) {
        if (dep.username) pendingUsers.add(dep.username);
      }
    }
    
    if (items && items.length && botInv) {
      for (const w of items) {
        if (w.status !== "approved") continue;
        if (pendingUsers.has(w.username)) {
          console.log("Offer #" + w.row + ": preskakuji withdrawal - uzivatel " + w.username + " ma pending deposit");
          continue;
        }
        if (pendingConfirm[w.row]) {
          const pc = pendingConfirm[w.row];
          const st = await new Promise((res) => manager.getOffer(pc.offerId, (e, o) => res(e ? null : o)));
          if (st && (st.state === 2 || st.state === 9)) {
            if (!pendingConfirmLogged[w.row] || Date.now() - pendingConfirmLogged[w.row] > 1800000) {
              console.log("Offer #" + w.row + ": stale ceka na rucni potvrzeni (trade #" + pc.offerId + ")");
              pendingConfirmLogged[w.row] = Date.now();
            }
            continue;
          }
          if (st && st.state === 3) {
            console.log("Offer #" + w.row + ": trade prijat, oznacuji hotovo");
            delete pendingConfirm[w.row];
            gasGet(GAS_URL + "?action=completeWithdrawal&row=" + w.row).catch(()=>{});
            continue;
          }
          console.log("Offer #" + w.row + ": predchozi trade skoncil (state=" + (st ? st.state : "?") + "), posilam znovu");
          delete pendingConfirm[w.row];
        }
        if (!w.tradeLink && !w.username) continue;
        let tradeUrl = w.tradeLink || "";
        try {
          const fresh = await gasGet(GAS_URL + "?action=getTradeLink&username=" + encodeURIComponent(w.username));
          if (fresh && typeof fresh === "string" && fresh.indexOf("tradeoffer/new") > -1) {
            if (fresh !== tradeUrl) console.log("Offer #" + w.row + ": pouzivam aktualni trade link z profilu");
            tradeUrl = fresh;
          }
        } catch (e) {}
        if (!tradeUrl) continue;
        var f = failedOffers["w_" + w.row];
        if (f && Date.now() - f.at < f.retryAfter) continue;

        var lastTry = lastWithdrawalAttempt[w.row] || 0;
        if (Date.now() - lastTry < 600000) continue;

        const t = parseTradeLink(tradeUrl);
        if (!t) { console.log("Offer #" + w.row + ": spatny trade link, preskakuji"); continue; }
        const wNorm = normSkin(w.item);
        const found = botInv.find(x => {
          const m = x.market_hash_name;
          if (!m) return false;
          const mNorm = normSkin(m);
          return mNorm === wNorm || mNorm.includes(wNorm);
        });
        if (!found) {
          console.log("Offer #" + w.row + ": '" + w.item + "' (normalizovano '" + wNorm + "') neni v botove inventari (" + botInv.length + " polozek), preskakuji");
          continue;
        }
        console.log("Offer #" + w.row + ": posilam '" + found.market_hash_name + "' (asset " + found.id + ") partneru " + t.partner);
        lastWithdrawalAttempt[w.row] = Date.now();
        await wait(15000);
        const offer = manager.createOffer(`https://steamcommunity.com/tradeoffer/new/?partner=${t.partner}&token=${t.token}`);
        offer.addMyItem(found);
        offer.setMessage(w.item);
        const userDetails = await new Promise((resolve) => {
          offer.getUserDetails((err, me, them) => {
            if (err) { console.log("Offer #" + w.row + ": partner overeni selhalo (" + err.message + ") - pokracuji bez overeni"); resolve(null); }
            else {
              console.log("Offer #" + w.row + ": partner=" + (them.personaName || "?") + " escrowDnu=" + (them.escrowDays !== undefined ? them.escrowDays : "?"));
              resolve(them);
            }
          });
        });
        await new Promise((resolve) => {
          offer.send((err, status) => {
            if (err) {
              var emsg = err.message || "";
              var isRate = (err.eresult === 15) || emsg.indexOf("try again later") > -1;
              var prevCount = ((failedOffers["w_" + w.row] || {}).count || 0) + 1;
              console.log("Chyba offer #" + w.row + ": " + emsg + (err.eresult ? " (eresult=" + err.eresult + ")" : "") + (isRate ? " -> retry za 15 min" : " -> retry za 1h"));
              failedOffers["w_" + w.row] = { at: Date.now(), retryAfter: isRate ? 900000 : 3600000, count: prevCount };
              if (isRate && prevCount >= 3) {
                console.log("!!! Offer #" + w.row + ": error 15 uz " + prevCount + "x po sobe. Zkontroluj: 1) visici nabidky (steamcommunity.com/my/tradeoffers/sent jako bot), 2) ucet neni Limited (store.steampowered.com/account), 3) trade link uzivatele je aktualni, 4) zadny ban/hold na uctu.");
              }
            } else {
              console.log(`Offer sent: ${status}`);
              confirmOffer(offer.id, w.row);
            }
            resolve();
          });
        });
      }
    }
  } catch (e) { console.error("Withdrawal error:", e.message); }

  if (pollCount % 10 === 0 && botInv) {
    try {
      const acceptedRes = await gasGet(GAS_URL + "?action=getDepositSkins");
      const accepted = typeof acceptedRes === "string" ? JSON.parse(acceptedRes) : acceptedRes;
      const priceMap = {};
      for (const a of accepted) { if (a.name && a.price > 0) priceMap[a.name.toLowerCase()] = a.price; }
      const botItems = [];
      for (const item of botInv) {
        const name = item.market_hash_name || "";
        if (!name) continue;
        botItems.push({ name: name, price: priceMap[name.toLowerCase()] || 0, image: item.icon_url_large ? "https://community.akamai.steamstatic.com/economy/image/" + item.icon_url_large : "", assetId: item.id, count: 1 });
      }
      await gasPost(GAS_URL + "?action=saveBotInventory", { data: JSON.stringify(botItems) });
      console.log("Bot inventory saved: " + botItems.length + " items");
    } catch(e) { console.error("Bot inventory save error:", e.message); }
  }

  try {
    await processDeposits();
  } catch(e) { console.error("Deposit processing error:", e.message); }

  setTimeout(poll, 60000);
}

async function processDeposits() {
  const depRes = await gasGet(GAS_URL + "?action=getPendingDeposits");
  if (!depRes) return;
  const pendings = typeof depRes === "string" ? JSON.parse(depRes) : depRes;
  if (!pendings || !pendings.length) return;

  console.log("Pending deposits: " + pendings.length);

  // Ziskat ceny z DepositSkins tabulky
  const priceRes = await gasGet(GAS_URL + "?action=getDepositSkins");
  const accepted = typeof priceRes === "string" ? JSON.parse(priceRes) : priceRes;
  const priceMap = {};
  for (const a of accepted) { if (a.name && a.price > 0) priceMap[a.name.toLowerCase()] = a.price; }

  for (const dep of pendings) {
    const username = dep.username;
    const items = dep.items || [];
    if (!items.length) continue;

    // Pokud uz mame offerId, zkontrolujeme stav nabidky
    if (dep.offerId) {
      try {
        const st = await new Promise((resolve) => {
          manager.getOffer(dep.offerId, (e, o) => resolve(e ? null : o));
        });
        if (st) {
          if (st.state === 3) {
            console.log("Deposit " + username + ": nabidka #" + dep.offerId + " prijata hracem");
            let totalValue = 0;
            for (const it of items) {
              let p = priceMap[it.name.toLowerCase()] || 0;
              if (p === 0) {
                const base = it.name.replace(/\s*\(.*\)\s*$/, "").trim();
                p = priceMap[base.toLowerCase()] || 0;
              }
              totalValue += p;
            }
            const completeRes = await gasGet(GAS_URL + "?action=completeDeposit&username=" + encodeURIComponent(username) + "&amount=" + totalValue.toFixed(2));
            try {
              const completeData = JSON.parse(completeRes);
              if (completeData.total) console.log("Deposit " + username + ": pripsano " + completeData.total + " Kč (bonus " + completeData.bonus + ")");
            } catch(e) { console.log("Deposit " + username + ": completeDeposit: " + completeRes); }
          } else if (st.state === 2 || st.state === 9) {
            console.log("Deposit " + username + ": nabidka #" + dep.offerId + " stale ceka na hrace");
          } else if (st.state === 6 || st.state === 7 || st.state === 11) {
            console.log("Deposit " + username + ": nabidka #" + dep.offerId + " zrusena/neuspesna");
          }
        }
      } catch(e) {
        console.error("Deposit offer status check error for " + username + ": " + e.message);
      }
      continue;
    }

    // Ziskat trade link hrace
    const tlRes = await gasGet(GAS_URL + "?action=getTradeLink&username=" + encodeURIComponent(username));
    const tradeUrl = tlRes && tlRes !== "NOT_SET" ? tlRes : "";
    if (!tradeUrl) {
      console.log("Deposit " + username + ": nemá trade link, preskakuji");
      continue;
    }
    const t = parseTradeLink(tradeUrl);
    if (!t) continue;

    // Vypocitat hodnotu a sestavit nabidku (bot chce tyhle skiny od hrace)
    let totalValue = 0;
    const depositItems = [];
    for (const it of items) {
      let price = priceMap[it.name.toLowerCase()] || 0;
      if (price === 0) {
        const baseName = it.name.replace(/\s*\(.*\)\s*$/, "").trim();
        price = priceMap[baseName.toLowerCase()] || 0;
      }
      totalValue += price;
      if (price > 0) {
        depositItems.push(it);
      }
    }
    if (!depositItems.length) {
      console.log("Deposit " + username + ": zadne platne skiny v nabidce");
      continue;
    }

    console.log("Deposit " + username + ": posilam nabidku pro " + depositItems.length + " skinu, celkem " + totalValue.toFixed(2) + " Kč");

    try {
      const offer = manager.createOffer(`https://steamcommunity.com/tradeoffer/new/?partner=${t.partner}&token=${t.token}`);
      // Bot CHCE tyhle skiny od hrade (items_to_receive)
      for (const it of depositItems) {
        offer.addTheirItem({
          appid: 730,
          contextid: it.contextid || "2",
          assetid: it.assetId
        });
      }
      offer.setMessage("Vklad skinu na bedny.cz - hodnota " + totalValue.toFixed(2) + " Kč");

      // Cekani pred odeslanim (rate limit ochrana)
      await wait(10000);

      let sendOk = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise((resolve, reject) => {
          offer.send((err, status) => {
            if (err) { reject(err); }
            else { console.log("Deposit offer sent to " + username + ": " + status + " offer #" + offer.id); sendOk = true; resolve(); }
          });
        });
        if (sendOk) break;
        console.log("Deposit " + username + ": pokus " + attempt + " selhal, zkusim znovu za 30s");
        await wait(30000);
      }

      // Ulozit offerId do GAS, abychom neposilali znovu
      await gasGet(GAS_URL + "?action=updateDepositOfferId&username=" + encodeURIComponent(username) + "&offerId=" + offer.id);
    } catch(e) {
      console.error("Deposit offer send error for " + username + ": " + e.message);
    }
  }
}

console.log("Bot spuštěn");
process.stdin.resume();
setInterval(() => {}, 60000);
