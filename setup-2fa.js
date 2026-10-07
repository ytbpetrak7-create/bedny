// Propojeni mobilniho autentikatoru pro bot ucet + ziskani klicu do bot-config.json
// Spust: node setup-2fa.js
const SteamCommunity = require("steamcommunity");
const { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } = require("steam-session");
const readline = require("readline");
const fs = require("fs");

const community = new SteamCommunity();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

(async () => {
  try {
    const accountName = (await ask("Steam login (Enter = pet7bot1): ")) || "pet7bot1";
    const password = await ask("Heslo: ");

    const session = new LoginSession(EAuthTokenPlatformType.MobileApp);
    const authed = new Promise((resolve, reject) => {
      session.on("authenticated", () => resolve(true));
      session.on("error", (e) => reject(e));
      session.on("timeout", () => reject(new Error("Login timeout")));
    });
    const guardDone = { done: false };
    session.on("steamGuardMachineToken", () => { guardDone.done = true; });

    let startResult;
    try {
      startResult = await session.startWithCredentials({ accountName, password });
    } catch (e) {
      throw new Error("Start loginu selhal: " + e.message);
    }

    if (startResult.actionRequired) {
      const types = (startResult.validActions || []).map((a) => a.type);
      console.log("Steam chce overeni typem: " + JSON.stringify(types) + " (2=email, 3=mobil)");
      const hasDevice = types.indexOf(EAuthSessionGuardType.DeviceCode) !== -1;
      const hasEmail = types.indexOf(EAuthSessionGuardType.EmailCode) !== -1;
      let code;
      if (hasDevice && !hasEmail) code = await ask("Kod z MOBILNI app (5 znaku VELKYMI, primo z aplikace - NE z emailu): ");
      else if (hasEmail && !hasDevice) code = await ask("Kod z emailu (SteamGuard): ");
      else code = await ask("Kod (mobilni app, prip. email): ");
      if (/[a-z]/.test(code)) {
        console.log("POZOR: kod obsahuje mala pismena - vypada na EMAIL kod. Mobilni kod ma jen VELKA pismena/cislice.");
      }
      try {
        await session.submitSteamGuardCode(code.toUpperCase());
      } catch (e) {
        throw new Error("Spatny kod nebo zamitnuto: " + e.message);
      }
    }

    await Promise.race([
      authed,
      new Promise((_, rej) => setTimeout(() => rej(new Error("Login timeout (60s)")), 60000))
    ]);
    console.log("Prihlaseno.");

    const cookies = await session.getWebCookies();
    community.setCookies(cookies);
    console.log("Access token: " + (session.accessToken ? "OK" : "CHYBI"));
    if (session.accessToken) {
      try {
        community.setMobileAppAccessToken(session.accessToken);
        console.log("Mobilni token: OK");
      } catch (e) {
        console.log("Mobilni token odmitnut: " + e.message);
        rl.close();
        return;
      }
    } else {
      console.log("Session nevratila token - enableTwoFactor nepujde.");
      rl.close();
      return;
    }
    console.log("Pridavam autentikator...");

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
