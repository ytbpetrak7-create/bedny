// Cloudflare Worker: Steam inventar proxy (resi 403/429 z GAS)
// Deploy: dash.cloudflare.com -> Workers & Pages -> Create Worker -> vlozit tento kod -> Save and deploy
// Pouziti: https://TVUJ.workers.dev/?steamid=7656119...
export default {
  async fetch(request) {
    const cors = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    const url = new URL(request.url);
    const steamId = url.searchParams.get("steamid") || "";
    if (!/^\d{15,20}$/.test(steamId)) {
      return new Response(JSON.stringify({ error: "missing steamid" }), { status: 400, headers: cors });
    }
    const target = "https://steamcommunity.com/inventory/" + steamId + "/730/2?l=english&count=500";
    try {
      const resp = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9"
        },
        redirect: "follow"
      });
      const body = await resp.text();
      return new Response(body, { status: resp.status, headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: "fetch failed" }), { status: 502, headers: cors });
    }
  }
};
