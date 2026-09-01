const SteamUser = require("steam-user");
const TradeOfferManager = require("steam-tradeoffer-manager");
const SteamCommunity = require("steamcommunity");
const https = require("https");
const fs = require("fs");
const readline = require("readline");

const GAS_URL = "https://script.google.com/macros/s/AKfycbwdqlML2S6Rz1joIwKZIPENJo_QT20XlwWIxSnulzb8f3d_xAkbCI70bXVRHt9m6X4/exec";

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({ steam: client, community: community, language: "en", pollInterval: 30000, cancelTime: 120000 });

const BOT = {
  accountName: "pet7bot1",
  password: "Petronel7"
};

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
  poll();
  autoConfirm();
});

var pollStarted = false;

function autoConfirm() {
  manager.getOffers({ confirmedNeedsConfirmation: true }, (err, sent, received) => {
    if (err) { console.log("Auto-confirm error:", err.message); return setTimeout(autoConfirm, 30000); }
    
    const needsConfirm = [...(sent || []), ...(received || [])];
    for (const offer of needsConfirm) {
      offer.accept((err) => {
        if (err) console.log("Auto-confirm accept error:", err.message);
        else console.log(`✅ Auto-potvrzeno: #${offer.id}`);
      });
    }
    setTimeout(autoConfirm, 10000);
  });
}

var sentry = fs.existsSync("sentry") ? fs.readFileSync("sentry") : null;

if (sentry) {
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
  const m = url.match(/partner=(\d+)&token=(\w+)/);
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

var pollCount = 0;

var lastWithdrawalAttempt = {};
var lastDepositAttempt = {};
var failedOffers = {};
var lastSteamCall = 0;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function poll() {
  pollCount++;
  console.log("Poll #" + pollCount + ": začátek");

  try {
    const invRequests = await gasGet(GAS_URL + "?action=getPendingInvRequests");
    const reqs = typeof invRequests === "string" ? JSON.parse(invRequests) : invRequests;
    if (reqs && reqs.length) {
      const req = reqs[0];
      try {
        const username = req.username;
        console.log("InvRequest: processing " + username);
        await wait(3000);
        const steamId = await gasGet(GAS_URL + "?action=getSteamId&username=" + encodeURIComponent(username));
        if (!steamId || steamId === "") {
          console.log("InvRequest: no steamId for " + username);
          gasGet(GAS_URL + "?action=setInventoryResult&username=" + encodeURIComponent(username) + "&items=" + encodeURIComponent(JSON.stringify([]))).catch(()=>{});
        } else {
          const userInv = await getUserInventory(steamId);
          if (userInv && userInv.rateLimited) {
            console.log("InvRequest: rate limited for " + username + " - will retry next poll");
          } else if (!userInv || !userInv.success || !userInv.assets) {
            console.log("InvRequest: inventory fetch failed for " + username);
            gasGet(GAS_URL + "?action=setInventoryResult&username=" + encodeURIComponent(username) + "&items=" + encodeURIComponent("[]")).catch(()=>{});
          } else {
            const acceptedRes = await gasGet(GAS_URL + "?action=getDepositSkins");
            const accepted = typeof acceptedRes === "string" ? JSON.parse(acceptedRes) : acceptedRes;
            const result = [];
            for (const id in userInv.assets) {
              const asset = userInv.assets[id];
              const classId = asset.classid + "_" + asset.instanceid;
              const desc = userInv.descriptions ? userInv.descriptions[classId] : null;
              if (!desc) continue;
              const name = desc.market_hash_name || "";
              const wearMatch = name.match(/\(([^)]+)\)\s*$/);
              const steamWear = wearMatch ? wearMatch[1] : "";
              const baseName = name.replace(/\s*\(.*\)\s*$/, "").toLowerCase();
              for (const a of accepted) {
                if (a.name && a.name.toLowerCase() === baseName && a.price > 0) {
                  if (!a.wear || a.wear.toLowerCase() === steamWear.toLowerCase()) {
                    result.push({ name: name, price: a.price, depositable: true, assetId: asset.id, icon: desc.icon_url_large || desc.icon_url || "" });
                    break;
                  }
                }
              }
            }
            console.log("InvRequest: " + username + " - " + result.length + " depositable items");
            gasGet(GAS_URL + "?action=setInventoryResult&username=" + encodeURIComponent(username) + "&items=" + encodeURIComponent(JSON.stringify(result))).catch(()=>{});
          }
        }
      } catch (e) { console.error("InvRequest error:", e.message); }
    }
  } catch (e) { console.error("InvRequest polling error:", e.message); }

  await wait(5000);

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
        if (!w.tradeLink) continue;
        if (failedOffers["w_" + w.row]) continue;

        var lastTry = lastWithdrawalAttempt[w.row] || 0;
        if (Date.now() - lastTry < 600000) continue;

        const t = parseTradeLink(w.tradeLink);
        if (!t) continue;
        const found = botInv.find(x => x.market_hash_name && x.market_hash_name.toLowerCase().includes(w.item.toLowerCase()));
        if (!found) {
          gasGet(GAS_URL + "?action=completeWithdrawal&row=" + w.row).catch(()=>{});
          continue;
        }
        lastWithdrawalAttempt[w.row] = Date.now();
        await wait(5000);
        const offer = manager.createOffer(`https://steamcommunity.com/tradeoffer/new/?partner=${t.partner}&token=${t.token}`);
        offer.addMyItem(found);
        offer.setMessage(w.item);
        await new Promise((resolve) => {
          offer.send((err, status) => {
            if (err) {
              console.log("Chyba offer #" + w.row + ": " + err.message);
              failedOffers["w_" + w.row] = true;
            } else {
              console.log(`Offer sent: ${status}`);
              gasGet(GAS_URL + "?action=completeWithdrawal&row=" + w.row).catch(()=>{});
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
