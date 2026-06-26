const SteamUser = require("steam-user");
const TradeOfferManager = require("steam-tradeoffer-manager");
const SteamCommunity = require("steamcommunity");
const https = require("https");
const fs = require("fs");
const readline = require("readline");

const GAS_URL = "https://script.google.com/macros/s/AKfycbxbDv3JEdMZ1gQpK_AULiG7o08LJ4_bY72l8lSSTApB1ZgP_oqeHUiWsW37ObBnNdbx-Q/exec";

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({ steam: client, community: community, language: "en", pollInterval: 30000 });

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
  fs.writeFileSync("cookies.json", JSON.stringify(cookies));
});
client.on("sentry", (buffer) => { fs.writeFileSync("sentry", buffer); });
client.on("error", (err) => { console.log("❌ Chyba:", err.message); if (err.eresult === 5) console.log("➡️  Zkus se na chvíli odhlásit ze Steamu v prohlížeči a pak spustit znovu"); });

manager.on("ready", () => { 
  console.log("✅ Trade manager ready"); 
  poll();
  autoConfirm();
});

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

if (process.argv.includes("--2fa")) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("🔑 Zadej kód z Steam mobile app: ", (code) => {
    rl.close();
    client.logOn({ accountName: BOT.accountName, password: BOT.password, machineName: "bot", sentry: sentry, twoFactorCode: code });
  });
} else {
  client.logOn({ accountName: BOT.accountName, password: BOT.password, machineName: "bot", sentry: sentry });
}

function gasGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); }).on("error", reject);
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

async function poll() {
  try {
    const items = await gasGet(GAS_URL + "?action=getWithdrawals");
    if (!items || !items.length) return setTimeout(poll, 30000);
    
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
  } catch (e) { console.error("Chyba:", e.message); }
  
  try {
    const result = await new Promise((resolve, reject) => {
      manager.getOffers({ received: true, active: true }, (err, sent, received) => {
        if (err) return reject(err);
        resolve(received || []);
      });
    });
    
    for (const offer of result) {
      if (offer.state !== 3) continue;
      
      const msg = (offer.message || "").trim();
      if (!msg) { console.log("Deposit bez zprávy, přeskakuji"); continue; }
      
      const username = msg;
      const itemNames = offer.items_to_receive.map(x => x.market_hash_name || "").filter(Boolean).join(";");
      if (!itemNames) continue;
      
      console.log(`Deposit: ${username} - ${itemNames}`);
      
      const depositResult = await gasGet(GAS_URL + "?action=depositSkin&username=" + encodeURIComponent(username) + "&items=" + encodeURIComponent(itemNames));
      console.log(`Deposit result: ${depositResult}`);
      
      offer.accept((err, status) => {
        if (err) return console.log("Chyba accept:", err);
        console.log(`Deposit accepted: ${status}`);
      });
    }
  } catch (e) { console.error("Deposit check error:", e.message); }
  
  setTimeout(poll, 30000);
}

console.log("Bot spuštěn");
process.stdin.resume();
setInterval(() => {}, 60000);
