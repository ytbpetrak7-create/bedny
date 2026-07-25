const SteamUser = require("steam-user");
const TradeOfferManager = require("steam-tradeoffer-manager");
const SteamCommunity = require("steamcommunity");
const https = require("https");
const fs = require("fs");
const readline = require("readline");

const GAS_URL = "https://script.google.com/macros/s/AKfycbxwKp6mTINrJiWKlHIDC02Qr1uunkDFjypqEtzedJflt_wimFS_YCcV9XvPnuR7CUf9kQ/exec";

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
    const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=czech&count=500`;
    function attempt(retries) {
      community.request({
        url: url,
        method: "GET",
        json: true
      }, (err, res, body) => {
        if (err) { console.log("InvFetch error:", err.message); return reject(err); }
        console.log("InvFetch: status=" + (res ? res.statusCode : "?"));
        if (res && res.statusCode === 429 && retries > 0) {
          console.log("InvFetch: rate limited, retry za 30s (" + retries + " retries left)");
          return setTimeout(() => attempt(retries - 1), 30000);
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

async function poll() {
  console.log("Poll: začátek");
  try {
    const items = await gasGet(GAS_URL + "?action=getWithdrawals");
    if (items && items.length) {
      const botInv = await getInventory();
      
      for (const w of items) {
        if (w.status !== "approved") continue;
        console.log(`${w.username} - ${w.item}`);
        if (!w.tradeLink) { console.log("Chybí tradeLink"); continue; }
        
        const t = parseTradeLink(w.tradeLink);
        if (!t) { console.log("Neplatný tradeLink"); continue; }
        
        const found = botInv.find(x => x.market_hash_name && x.market_hash_name.toLowerCase().includes(w.item.toLowerCase()));
        if (!found) { console.log("Item nenalezen v inventáři bota:", w.item); continue; }
        
        const offer = manager.createOffer(`https://steamcommunity.com/tradeoffer/new/?partner=${t.partner}&token=${t.token}`);
        offer.addMyItem(found);
        offer.setMessage(w.item);
        offer.send((err, status) => {
          if (err) return console.log("Chyba:", err);
          console.log(`Offer sent: ${status}`);
          https.get(GAS_URL + "?action=completeWithdrawal&row=" + w.row);
        });
      }
    }
  } catch (e) { console.error("Withdrawal error:", e.message); }

  try {
    const pendingDeposits = await gasGet(GAS_URL + "?action=getPendingDeposits");
    const deps = typeof pendingDeposits === "string" ? JSON.parse(pendingDeposits) : pendingDeposits;
      if (deps && deps.length) {
      for (const dep of deps) {
        try {
          console.log("Deposit: processing " + dep.username + " items=" + JSON.stringify(dep.items));
          const tradeLink = await gasGet(GAS_URL + "?action=getTradeLink&username=" + encodeURIComponent(dep.username));
          if (!tradeLink || tradeLink === "NOT_SET" || tradeLink === "MISSING") {
            console.log("Deposit: chybí tradeLink pro " + dep.username);
            continue;
          }
          const t = parseTradeLink(tradeLink);
          if (!t) { console.log("Deposit: neplatný tradeLink pro " + dep.username); continue; }

          const offer = manager.createOffer(`https://steamcommunity.com/tradeoffer/new/?partner=${t.partner}&token=${t.token}`);
          for (const item of dep.items) {
            if (item.assetId) {
              offer.addTheirItem({ appid: 730, contextid: item.contextid || "2", assetid: item.assetId, amount: item.amount || "1" });
              console.log("Deposit: added " + item.name + " (assetId=" + item.assetId + ", amount=" + (item.amount || "1") + ")");
            } else {
              console.log("Deposit: přeskočeno (bez assetId): " + item.name);
            }
          }
          if (!offer.items_to_receive || !offer.items_to_receive.length) {
            console.log("Deposit: žádné položky k přijetí pro " + dep.username);
            https.get(GAS_URL + "?action=removePendingDeposit&username=" + encodeURIComponent(dep.username));
            continue;
          }
          const totalValue = dep.items.reduce((s, i) => s + (i.price || 0), 0);
          offer.setMessage("Deposit " + totalValue.toFixed(2) + " Kč");
          offer.send((err, status) => {
            if (err) { console.log("Deposit offer error:", err.message); return; }
            console.log(`Deposit offer sent to ${dep.username}: ${status}`);
          });
          https.get(GAS_URL + "?action=removePendingDeposit&username=" + encodeURIComponent(dep.username));
        } catch (e) { console.error("Deposit processing error:", e.message); }
      }
    }
  } catch (e) { console.error("Deposit polling error:", e.message); }

  try {
    const invRequests = await gasGet(GAS_URL + "?action=getPendingInvRequests");
    const reqs = typeof invRequests === "string" ? JSON.parse(invRequests) : invRequests;
    console.log("InvRequest: poll - " + (reqs ? reqs.length : 0) + " pending");
    if (reqs && reqs.length) {
      for (const req of reqs) {
        try {
          const username = req.username;
          console.log("InvRequest: processing " + username);
          const steamId = await gasGet(GAS_URL + "?action=getSteamId&username=" + encodeURIComponent(username));
          if (!steamId || steamId === "") { console.log("InvRequest: no steamId for " + username); continue; }
          console.log("InvRequest: steamId " + steamId + " for " + username);

          const userInv = await getUserInventory(steamId);
          console.log("InvRequest: inventory fetched - success=" + (userInv ? userInv.success : "null") + " assets=" + (userInv && userInv.assets ? Object.keys(userInv.assets).length : 0));
          var invNames = [];
          for (var iid in userInv.assets) {
            var a = userInv.assets[iid];
            var cl = a.classid + "_" + a.instanceid;
            var d = userInv.descriptions ? userInv.descriptions[cl] : null;
            if (d && d.market_hash_name) invNames.push(d.market_hash_name);
            if (invNames.length >= 5) break;
          }
          console.log("InvRequest: first items: " + JSON.stringify(invNames));
          if (!userInv || !userInv.success || !userInv.assets) {
            console.log("InvRequest: inventory fetch failed for " + username);
            https.get(GAS_URL + "?action=setInventoryResult&username=" + encodeURIComponent(username) + "&items=" + encodeURIComponent("[]"));
            continue;
          }

          const acceptedRes = await gasGet(GAS_URL + "?action=getDepositSkins");
          const accepted = typeof acceptedRes === "string" ? JSON.parse(acceptedRes) : acceptedRes;
          console.log("InvRequest: accepted skins: " + JSON.stringify(accepted.map(a => a.name + " [" + a.wear + "] " + a.price + "Kc")));

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
                  result.push({ name: name, price: a.price, assetId: asset.id, icon: desc.icon_url_large || desc.icon_url || "" });
                  break;
                }
              }
            }
          }
          console.log("InvRequest: " + username + " - " + result.length + " items (accepted: " + accepted.length + ", inventory: " + Object.keys(userInv.assets).length + ")");
          https.get(GAS_URL + "?action=setInventoryResult&username=" + encodeURIComponent(username) + "&items=" + encodeURIComponent(JSON.stringify(result)));
          console.log("InvRequest: " + username + " - " + result.length + " items");
        } catch (e) { console.error("InvRequest error:", e.message); }
      }
    }
  } catch (e) { console.error("InvRequest polling error:", e.message); }

  setTimeout(poll, 30000);
}

console.log("Bot spuštěn");
process.stdin.resume();
setInterval(() => {}, 60000);
