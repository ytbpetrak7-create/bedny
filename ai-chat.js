// AI podpora - plovouci chat widget (Pollinations.ai, zdarma, bez klice)
(function() {
  var SYSTEM = "Jsi ceska AI podpora pro web s CS2 bednami (case opening). Odpovidej strucne cesky. "
    + "Jak web funguje: uzivatel se prihlasi pres Steam, bedny Boxes1 stoji 2 Kc a Boxes2 6 Kc za otevreni. "
    + "Kc ziskas prodejem vyhranich skinu, depositem vlastnich CS2 skinu pres Steam trade (bot ucet), denni odmenou na profilu, odmenami za levely (100 levelu) a referral kodem (+6 Kc pro noveho, 10% bonus z depositu a 1% z otevirani pro zvouciho). "
    + "Vybrane skiny jdou vyzvednout (withdraw) - bot posle Steam trade offer, kterou uzivatel potvrdi. "
    + "Opotrebeni skinu: Factory New, Minimal Wear, Field-Tested, Well-Worn, Battle-Scarred. "
    + "Kdyz nevis odpoved, rekni at se uzivatel ozve adminovi. Nepis dlouhe odpovedi.";

  var history = [{ role: "system", content: SYSTEM }];

  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return d.firstChild;
  }

  var btn = el('<button id="aiBtn" style="position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#c850ff,#a040e0);color:#fff;font-size:26px;cursor:pointer;z-index:9000;box-shadow:0 4px 15px rgba(0,0,0,0.4);">💬</button>');
  var win = el('<div id="aiWin" style="display:none;position:fixed;bottom:88px;right:20px;width:320px;max-width:90vw;height:420px;background:#1a1a2e;border:1px solid #a040e0;border-radius:16px;z-index:9000;flex-direction:column;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.5);">'
    + '<div style="background:linear-gradient(135deg,#c850ff,#a040e0);color:#fff;padding:12px;font-weight:bold;font-size:14px;">AI podpora 🤖</div>'
    + '<div id="aiMsgs" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;"></div>'
    + '<div style="display:flex;gap:6px;padding:10px;border-top:1px solid #333;">'
    + '<input id="aiIn" type="text" placeholder="Zeptej se..." style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid #555;background:#0d0d1a;color:#fff;font-size:13px;">'
    + '<button id="aiSend" style="padding:8px 14px;border-radius:8px;border:none;background:#00ff96;color:#1a1a2e;font-weight:bold;cursor:pointer;">➤</button>'
    + '</div></div>');

  function mount() {
    document.body.appendChild(btn);
    document.body.appendChild(win);
    btn.onclick = function() {
      var open = win.style.display === "flex";
      win.style.display = open ? "none" : "flex";
      if (!open && !win.dataset.hi) {
        win.dataset.hi = "1";
        addMsg("ai", "Ahoj! 👋 Zeptej se na bedny, deposit, výběr skinů, levely... (info nemusí být 100%)");
      }
    };
    document.getElementById("aiSend").onclick = send;
    document.getElementById("aiIn").addEventListener("keydown", function(e) { if (e.key === "Enter") send(); });
  }

  function addMsg(who, text) {
    var box = document.getElementById("aiMsgs");
    var m = document.createElement("div");
    m.style.cssText = who === "me"
      ? "align-self:flex-end;background:#00ff96;color:#1a1a2e;padding:8px 12px;border-radius:12px 12px 4px 12px;max-width:85%;font-size:13px;"
      : "align-self:flex-start;background:#2a2a4a;color:#fff;padding:8px 12px;border-radius:12px 12px 12px 4px;max-width:85%;font-size:13px;white-space:pre-wrap;";
    m.textContent = text;
    box.appendChild(m);
    box.scrollTop = box.scrollHeight;
    return m;
  }

  function ensurePuter() {
    return new Promise(function(resolve) {
      if (window.puter && window.puter.ai) return resolve(true);
      var s = document.createElement("script");
      s.src = "https://js.puter.com/v2/";
      s.onload = function() { resolve(true); };
      s.onerror = function() { resolve(false); };
      document.head.appendChild(s);
      setTimeout(function() { resolve(!!(window.puter && window.puter.ai)); }, 8000);
    });
  }

  async function askPuter() {
    var ok = await ensurePuter();
    if (!ok || !window.puter || !window.puter.ai) throw new Error("puter nedustupny");
    var resp = await window.puter.ai.chat(history);
    var txt = "";
    if (resp) {
      if (resp.message && typeof resp.message.content === "string") txt = resp.message.content;
      else if (typeof resp.text === "string") txt = resp.text;
      else txt = String(resp);
    }
    txt = (txt || "").trim();
    if (!txt) throw new Error("prazdna odpoved");
    return txt;
  }

  async function askPollinations() {
    var convo = history.filter(function(h) { return h.role !== "system"; }).map(function(h) {
      return (h.role === "user" ? "Uzivatel: " : "Asistent: ") + h.content;
    }).join("\n");
    var res = await fetch("https://text.pollinations.ai/" + encodeURIComponent(SYSTEM + "\n\n" + convo));
    if (!res.ok) throw new Error("HTTP " + res.status);
    var t = (await res.text()).trim();
    if (!t) throw new Error("prazdna odpoved");
    return t;
  }

  async function send() {
    var inp = document.getElementById("aiIn");
    var q = inp.value.trim();
    if (!q) return;
    inp.value = "";
    addMsg("me", q);
    history.push({ role: "user", content: q });
    if (history.length > 12) history = [history[0]].concat(history.slice(-11));
    var typing = addMsg("ai", "...");
    var ans = null;
    try { ans = await askPuter(); }
    catch (e1) {
      try { ans = await askPollinations(); }
      catch (e2) { ans = null; }
    }
    typing.textContent = ans || "AI teď neodpovídá, zkus to za chvíli. 😕";
    if (ans) history.push({ role: "assistant", content: ans });
    var box = document.getElementById("aiMsgs");
    box.scrollTop = box.scrollHeight;
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
