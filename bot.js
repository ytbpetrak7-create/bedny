const SteamUser = require("steam-user");
const TradeOfferManager = require("steam-tradeoffer-manager");
const SteamCommunity = require("steamcommunity");
const SteamTotp = require("steam-totp");
const https = require("https");
const fs = require("fs");
const readline = require("readline");

const GAS_URL = "https://script.google.com/macros/s/AKfycbz89Ud1exW-1dpUuyuO1q23upXGWEf7C5ydVBEOz3M8yDB-ZlU3GGMP8bWPqUGveq3c5Q/exec";

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
  console.log("✅ Bot přihlášen"); 
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

if (BOT.sharedSecret) {
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

var lastWithdrawalAttempt = {};
var lastDepositAttempt = {};
var failedOffers = {};
var lastSteamCall = 0;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function poll() {
  pollCount++;
  console.log("Poll #" + pollCount + ": začátek");

  await wait(3000);

  var botInv = null;
  try {
    botInv = await getInventory();
    console.log("Poll: bot inventory loaded - " + botInv.length + " items");
  } catch(e) { console.error("Bot inventory error:", e.message); }

  try {
    const items = await gasGet(GAS_URL + "?action=getWithdrawals");
    if (items && items.length && botInv) {
      for (const w of items) {
        if (w.status !== "approved") continue;
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
        const found = botInv.find(x => x.market_hash_name && x.market_hash_name.toLowerCase().includes(w.item.toLowerCase()));
        if (!found) {
          console.log("Offer #" + w.row + ": '" + w.item + "' neni v botove inventari, preskakuji");
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
            if (err) { console.log("Offer #" + w.row + ": partner overeni selhalo: " + err.message + " (spatny/expirovany trade link?)"); resolve(null); }
            else {
              console.log("Offer #" + w.row + ": partner=" + (them.personaName || "?") + " escrowDnu=" + (them.escrowDays !== undefined ? them.escrowDays : "?"));
              resolve(them);
            }
          });
        });
        if (!userDetails) {
          failedOffers["w_" + w.row] = { at: Date.now(), retryAfter: 3600000, count: ((failedOffers["w_" + w.row] || {}).count || 0) + 1 };
          continue;
        }
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
      const seen = {};
      const botItems = [];
      for (const item of botInv) {
        const name = item.market_hash_name || "";
        if (!name || seen[name.toLowerCase()]) continue;
        seen[name.toLowerCase()] = true;
        botItems.push({ name: name, price: priceMap[name.toLowerCase()] || 0, image: item.icon_url_large ? "https://community.akamai.steamstatic.com/economy/image/" + item.icon_url_large : "", assetId: item.id, count: 1 });
      }
      await gasPost(GAS_URL + "?action=saveBotInventory", { data: JSON.stringify(botItems) });
      console.log("Bot inventory saved: " + botItems.length + " items");
    } catch(e) { console.error("Bot inventory save error:", e.message); }
  }

  setTimeout(poll, 60000);
}

console.log("Bot spuštěn");
process.stdin.resume();
setInterval(() => {}, 60000);
