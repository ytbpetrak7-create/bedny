// Propojeni mobilniho autentikatoru pro bot ucet + ziskani klicu do bot-config.json
// Spust: node setup-2fa.js
const SteamCommunity = require("steamcommunity");
const readline = require("readline");
const fs = require("fs");

const community = new SteamCommunity();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

function doLogin(details) {
  return new Promise((resolve, reject) => {
    community.login(details, (err, sessionID, cookies) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

(async () => {
  try {
    const accountName = (await ask("Steam login (Enter = pet7bot1): ")) || "pet7bot1";
    const password = await ask("Heslo: ");

    try {
      await doLogin({ accountName, password });
    } catch (e) {
      if (e.message && e.message.indexOf("SteamGuard") !== -1) {
        const code = await ask("Kod z emailu (SteamGuard): ");
        await doLogin({ accountName, password, authCode: code });
      } else {
        throw e;
      }
    }
    console.log("Prihlaseno. Pridavam autentikator...");

    const res = await new Promise((resolve, reject) => {
      community.enableTwoFactor((err, r) => {
        if (err) return reject(err);
        resolve(r);
      });
    });

    if (res.status !== 1) {
      console.log("enableTwoFactor status:", res.status, JSON.stringify(res).substring(0, 300));
      if (res.status === 84) console.log("Rate limit - zkus to za par minut znovu.");
      rl.close();
      return;
    }

    console.log("SMS kod poslan na cislo koncici: " + (res.phone_number_hint || "?"));
    const sms = await ask("SMS kod: ");

    await new Promise((resolve, reject) => {
      community.finalizeTwoFactor(res.shared_secret, sms, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    console.log("\nHotovo! Autentikator presunut do bota.");
    console.log("REVOCATION CODE (uschovej!): " + res.revocation_code);

    fs.writeFileSync("bot-config.json", JSON.stringify({
      sharedSecret: res.shared_secret,
      identitySecret: res.identity_secret
    }, null, 2));
    console.log("bot-config.json zapsan. Muzes spustit: node bot.js");
  } catch (e) {
    console.log("Chyba:", e.message);
  }
  rl.close();
})();
