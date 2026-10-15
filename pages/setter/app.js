/* Witchcraft Setter v3: page runtime. No secrets live here: the Spatius key stays in the umbra-spatius Worker and the
   ElevenLabs key never leaves the operator's machine. The live call talks to a public, origin-allowlisted ElevenLabs
   Conversational agent (Artemis); the scripted fallback plays pre-rendered eleven_v3 PCM lines. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  /* ---------------- attribution (first touch this session) ---------------- */
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
  function attribution() {
    var saved = null; try { saved = JSON.parse(store.get('ws_attr') || 'null'); } catch (e) {}
    if (saved) return saved;
    var q = new URLSearchParams(location.search), a = {};
    ATTR_KEYS.forEach(function (k) { var v = q.get(k); if (v) a[k] = v.slice(0, 300); });
    a.referrer = (document.referrer || '').slice(0, 300);
    a.landing = (location.pathname + location.search).slice(0, 300);
    store.set('ws_attr', JSON.stringify(a));
    return a;
  }
  attribution();

  /* ---------------- hero field: leads going cold vs answered ---------------- */
  (function field() {
    var cv = $('field'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, leads = [], booked = [], ash = [];
    var cold = 0, warm = 0, book = 0, last = 0, spawnT = 0, running = true, px = -1e4, py = -1e4;
    function size() { var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    cv.parentElement.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; });
    cv.parentElement.addEventListener('pointerleave', function () { px = py = -1e4; });
    function nodeB() { return { x: W * 0.78, y: H * 0.74 }; }
    function crmA() { return { x: W * 0.8, y: H * 0.3 }; }
    function spawn() {
      var fy = Math.random();
      var ya = H * (0.14 + fy * 0.28), yb = H * (0.6 + fy * 0.24);
      var sp = 34 + Math.random() * 30;
      leads.push({ lane: 'a', x: -6, y: ya, vx: sp, vy: (Math.random() - .5) * 6, age: 0, heat: 1, late: Math.random() < 0.07, dead: false });
      leads.push({ lane: 'b', x: -6, y: yb, vx: sp, vy: (Math.random() - .5) * 6, age: 0, heat: 1, hit: false, orbit: 0, book: Math.random() < 0.32, dead: false, ang: 0, r: 0 });
    }
    function lerpColor(t) { // 0 grey -> 1 rose
      var a = [138, 133, 148], b = [227, 169, 162];
      return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
    }
    function draw(t) {
      if (!running) { last = t; requestAnimationFrame(draw); return; }
      var dt = Math.min(0.05, ((t - last) || 16) / 1000); last = t;
      ctx.clearRect(0, 0, W, H);
      spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = 0.42 + Math.random() * 0.35; }
      var nb = nodeB(), ca = crmA();
      // CRM box (lane A)
      ctx.strokeStyle = 'rgba(237,230,218,.18)'; ctx.lineWidth = 1; ctx.strokeRect(ca.x - 26, ca.y - 18, 52, 36);
      ctx.fillStyle = 'rgba(138,133,148,.7)'; ctx.font = '10px Archivo, Helvetica, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('CRM', ca.x, ca.y + 4);
      // setter node (lane B)
      var g = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, 70);
      g.addColorStop(0, 'rgba(183,110,121,.55)'); g.addColorStop(.35, 'rgba(25,25,112,.45)'); g.addColorStop(1, 'rgba(25,25,112,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nb.x, nb.y, 70, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#E3A9A2'; ctx.beginPath(); ctx.arc(nb.x, nb.y, 4.5, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(227,169,162,.25)'; ctx.beginPath(); ctx.arc(nb.x, nb.y, 26 + 4 * Math.sin(t / 500), 0, 6.283); ctx.stroke();
      for (var i = leads.length - 1; i >= 0; i--) {
        var L = leads[i]; L.age += dt;
        var near = Math.hypot(L.x - px, L.y - py) < 60 ? 1 : 0;
        if (L.lane === 'a') {
          L.heat = Math.exp(-L.age / 1.7);
          L.vx *= (1 - 0.55 * dt); L.x += L.vx * dt; L.y += L.vy * dt;
          if (L.late && L.age > 2.2) { L.x += (ca.x - L.x) * 1.8 * dt; L.y += (ca.y - L.y) * 1.8 * dt; if (Math.hypot(L.x - ca.x, L.y - ca.y) < 8) { L.dead = true; } }
          else if (L.heat < 0.06) { L.dead = true; cold++; for (var k = 0; k < 3; k++) ash.push({ x: L.x, y: L.y, vy: 8 + Math.random() * 14, vx: (Math.random() - .5) * 6, a: .5 }); }
          ctx.fillStyle = lerpColor(Math.max(0, L.heat)); ctx.globalAlpha = 0.25 + 0.75 * L.heat + near * .3;
          ctx.beginPath(); ctx.arc(L.x, L.y, 1.6 + 2.2 * L.heat + near, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
        } else {
          if (!L.hit && L.age > 0.28) { L.hit = true; warm++; }
          if (L.hit) {
            var dx = nb.x - L.x, dy = nb.y - L.y, d = Math.hypot(dx, dy);
            if (L.age < 0.7) { ctx.strokeStyle = 'rgba(227,169,162,' + (0.9 - (L.age - .28)) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(nb.x, nb.y); ctx.lineTo(L.x, L.y); ctx.stroke(); }
            if (d > 30 && !L.orbit) { L.x += dx * 2.4 * dt; L.y += dy * 2.4 * dt; }
            else { if (!L.orbit) { L.orbit = 1; L.ang = Math.atan2(L.y - nb.y, L.x - nb.x); L.r = d; }
              L.orbit += dt; L.ang += 2.6 * dt; L.r += (L.book ? 34 : 60) * dt * .6;
              L.x = nb.x + Math.cos(L.ang) * L.r; L.y = nb.y + Math.sin(L.ang) * L.r * .55;
              if (L.orbit > 1.3) { L.dead = true; if (L.book) { book++; booked.push({ a: Math.random() * 6.283, r: 40 + Math.random() * 26, s: .15 + Math.random() * .2, life: 9 }); } } }
          } else { L.x += L.vx * dt; L.y += L.vy * dt; }
          ctx.fillStyle = L.hit ? (L.book ? '#E3A9A2' : '#8C95E0') : '#CFC7BA';
          ctx.shadowColor = L.hit ? '#B76E79' : 'transparent'; ctx.shadowBlur = L.hit ? 10 : 0;
          ctx.beginPath(); ctx.arc(L.x, L.y, 2.6 + near, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        }
        if (L.dead || L.x > W + 10) leads.splice(i, 1);
      }
      for (var j = booked.length - 1; j >= 0; j--) { var B = booked[j]; B.a += B.s * dt; B.life -= dt; if (B.life <= 0) { booked.splice(j, 1); continue; }
        ctx.fillStyle = 'rgba(227,169,162,' + Math.min(.9, B.life / 3) + ')'; ctx.beginPath(); ctx.arc(nb.x + Math.cos(B.a) * B.r, nb.y + Math.sin(B.a) * B.r * .55, 1.8, 0, 6.283); ctx.fill(); }
      for (var m = ash.length - 1; m >= 0; m--) { var A = ash[m]; A.y += A.vy * dt; A.x += A.vx * dt; A.a -= .35 * dt; if (A.a <= 0) { ash.splice(m, 1); continue; }
        ctx.fillStyle = 'rgba(138,133,148,' + A.a + ')'; ctx.fillRect(A.x, A.y, 1.2, 1.2); }
      $('coldN').textContent = cold; $('warmN').textContent = warm; $('bookN').textContent = book;
      requestAnimationFrame(draw);
    }
    if (reduce) { for (var s = 0; s < 40; s++) spawn(); running = true; }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { running = e[0].isIntersecting; }).observe(cv);
    requestAnimationFrame(draw);
  })();

  /* ---------------- ROI ---------------- */
  (function roi() {
    var fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }), f1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
    var usd = function (v) { return (v < 0 ? '-$' : '$') + fmt.format(Math.abs(v)); };
    function n(id) { var v = parseFloat($(id).value); return isFinite(v) && v >= 0 ? v : 0; }
    function calc() {
      var L = n('rLeads'), B = n('rBook') / 100, S = n('rShow') / 100, C = n('rClose') / 100, D = n('rDeal'), ns = n('rSet'), cs = n('rCost'), P = n('rPrice'), U = n('rUp') / 100;
      $('rUpV').textContent = Math.round(U * 100) + '%';
      var b1 = L * B, s1 = b1 * S, d1 = s1 * C, r1 = d1 * D, c1 = ns * cs, b2 = L * B * (1 + U), s2 = b2 * S, d2 = s2 * C, r2 = d2 * D, c2 = s2 * P;
      $('oB1').textContent = f1.format(b1); $('oB2').textContent = f1.format(b2); $('oS1').textContent = f1.format(s1); $('oS2').textContent = f1.format(s2);
      $('oD1').textContent = f1.format(d1); $('oD2').textContent = f1.format(d2); $('oR1').textContent = usd(r1); $('oR2').textContent = usd(r2);
      $('oC1').textContent = usd(c1); $('oC2').textContent = usd(c2); $('oP1').textContent = s1 > 0 ? usd(c1 / s1) : '·'; $('oP2').textContent = s2 > 0 ? usd(P) : '·';
      var net = (c1 - c2) + (r2 - r1); $('oNet').textContent = (net >= 0 ? '+' : '') + usd(net) + ' / mo'; $('oNet').style.color = net >= 0 ? 'var(--ok)' : 'var(--rose-l)';
    }
    ['rLeads', 'rBook', 'rShow', 'rClose', 'rDeal', 'rSet', 'rCost', 'rPrice', 'rUp'].forEach(function (id) { $(id).addEventListener('input', calc); });
    calc();
  })();

  /* ---------------- voice (ElevenLabs v3 pre-rendered PCM16 24 kHz) ---------------- */
  var RATE = 24000;
  var LINES = {
    L01_open: "Hey! It's Artemis, the booking assistant at Northstar Coaching. Quick heads up: I'm an AI, and I can get you to a real coach any time. You just asked about the free strategy call. Got two minutes to see if it's a fit?",
    L02_ai: "Yes, I'm an AI assistant. I handle the booking so nobody has to wait for a callback. If you'd rather talk to a person right now, I can put a coach on the line. Or we keep going and I'll set it up. Your call.",
    L03_price: "Totally fair question. It depends on which program fits, and the coach walks you through it properly on the call. For context, most clients invest between three and eight thousand. Before we get there...",
    L04_info: "I'm texting you the overview right now. One thing though: people who only read the PDF rarely get the result, because the plan gets built around your numbers. So the coach comes prepared...",
    L05_already: "Good to hear, and we're not trying to replace them. Lots of our clients come in while they're working with someone else.",
    L06_goal: "So, what's the result you're after? What would make this a win for you?",
    L07_now: "Love that. And where are you at right now, roughly? Monthly revenue, or wherever things stand today?",
    L08_time: "Got it, that helps. When do you want this sorted: this month, this quarter, or are you just exploring for now?",
    L09_decide: "Makes sense. Last one: if the plan makes sense on the call, are you the one who decides, and have you got budget set aside for it?",
    L10_hot: "Honestly? You're exactly who our coaches work with. Marcus is free right now. Want me to put you straight through? I'll pass him everything you've told me, so you won't have to repeat yourself.",
    L11_slots: "Great. Let's get you on with a coach. I've got today at three-thirty, tomorrow at ten, or tomorrow at one-fifteen. Which works best?",
    L12_partner: "Smart move. Let's book a time when you can both be on, so nobody has to repeat anything. What suits you both?",
    L13_nurture: "Totally get it, and honestly, that helps. Rather than take a coach's slot you might not need yet, I'll text you our free twenty-minute training now and check back in two weeks. Sound fair?",
    L14_booked: "Done, you're booked! You'll get a confirmation text now, a reminder the day before, and a short video from your coach so you know who you're meeting. If anything changes, just reply and I'll move it.",
    L15_transfer: "Putting you through to Marcus now. He's got your goal, your numbers and your timeline on his screen. Stay on the line, it'll take about three seconds.",
    L16_stop: "Understood. You won't hear from us again, and I've taken you off every list. Take care.",
    L17_later: "No stress at all. Want me to call you back later today, or should I hold a fifteen-minute slot tomorrow morning?",
    L18_when: "All good. When's better: later today, or tomorrow morning?",
    L19_perfect: "Perfect.",
    L20_tight: "Understood. The coach can walk you through options that fit your budget.",
    L21_pilot: "Hey, it's Artemis from Witchcraft Setter. You just asked us for a pilot, so this is exactly what your leads would get, a few seconds after they opt in. I'm an AI, and someone from our team will follow up with you personally today. Want to see how I'd qualify one of your leads? Just play the lead."
  };
  var cache = {};
  function clip(name) { if (!cache[name]) cache[name] = fetch('/setter/voice/' + name + '.pcm', { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error('clip ' + name + ' ' + r.status); return r.arrayBuffer(); }); return cache[name]; }
  function concat(bufs) { var n = 0; bufs.forEach(function (b) { n += b.byteLength - (b.byteLength % 2); }); var out = new Uint8Array(n), o = 0; bufs.forEach(function (b) { var l = b.byteLength - (b.byteLength % 2); out.set(new Uint8Array(b, 0, l), o); o += l; }); return out.buffer; }
  var actx = null, analyser = null, srcNode = null;
  function audio() { if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); analyser = actx.createAnalyser(); analyser.fftSize = 256; analyser.connect(actx.destination); } if (actx.state === 'suspended') actx.resume(); return actx; }
  function playPCM(buf) {
    return new Promise(function (res) {
      var ctx = audio(), i16 = new Int16Array(buf), ab = ctx.createBuffer(1, i16.length, RATE), ch = ab.getChannelData(0);
      for (var i = 0; i < i16.length; i++) ch[i] = i16[i] / 32768;
      try { srcNode && srcNode.stop(); } catch (e) {}
      srcNode = ctx.createBufferSource(); srcNode.buffer = ab; srcNode.connect(analyser); srcNode.onended = function () { res(); }; srcNode.start();
    });
  }
  (function wave() { var c = $('wave'); if (!c) return; var g = c.getContext('2d'), data = new Uint8Array(128);
    function f() { var w = c.clientWidth, h = c.clientHeight; if (c.width !== w) { c.width = w; c.height = h; } g.clearRect(0, 0, w, h);
      if (analyser) analyser.getByteFrequencyData(data); var bars = 48, bw = w / bars;
      for (var i = 0; i < bars; i++) { var v = analyser ? data[i + 2] / 255 : 0.03; var bh = Math.max(2, v * h); g.fillStyle = 'rgba(227,169,162,' + (0.35 + v * .65) + ')'; g.fillRect(i * bw + 1, (h - bh) / 2, bw - 2, bh); }
      requestAnimationFrame(f); } f(); })();

  /* ---------------- Spatius live face ---------------- */
  // Spatius public-library avatar ids (Studio > Public Avatars; the demo characterIds are a different id space). ?face=nadia etc. for QA.
  var FACES = { leyla: '8b86dda1-98ed-4acd-8a4e-b1a00ba69268', nadia: '9078fde3-8e55-4311-a8d6-7740185b5b0d', camille: '82d7dce9-ec05-4102-969f-2fe341af28cd', clara: 'd51ab422-3db7-47cc-afa8-7273b02bc70b' };
  var FACE_ID = FACES[new URLSearchParams(location.search).get('face')] || FACES.camille; // Camille 82d7dce9 (cover image checked 17:08; 86f8b4f0 is the cartoon Zoe)
  var face = { on: false, ctrl: null, playing: false };
  window.WSFace = face; // read-only debug handle for QA
  function loadAvatarLib() {
    return new Promise(function (res, rej) {
      if (window.WSAvatar) return res(window.WSAvatar);
      var s = document.createElement('script'); s.type = 'module'; s.src = '/setter/avatar/avatar.js'; // no query string: the SDK's wasm chunk imports '../avatar.js' and must get this same module instance
      var to = setTimeout(function () { rej(new Error('avatar_lib_timeout')); }, 30000);
      window.addEventListener('wsavatar-ready', function () { clearTimeout(to); res(window.WSAvatar); }, { once: true });
      s.onerror = function () { clearTimeout(to); rej(new Error('avatar_lib_load')); };
      document.head.appendChild(s);
    });
  }
  // 28 Sep: background behind the face (the SDK canvas is transparent), a different one each instance (spatius-kit bg set)
  var BGS = ['uni-office-oak', 'uni-office-modern', 'uni-cloister', 'uni-seminar', 'uni-study-globe', 'uni-lecture-hall', 'uni-study-window'], bgEl = null; // 28 Sep 16:30: university / professor office set replaces the surreal library
  function backdrop() {
    var host = $('avatarHost'), last = -1; if (!host || !host.parentNode) return null;
    try { last = parseInt(localStorage.getItem('sf-bg-last'), 10); } catch (e) {}
    var i = Math.floor(Math.random() * BGS.length); if (i === last) i = (i + 1) % BGS.length;
    try { localStorage.setItem('sf-bg-last', String(i)); } catch (e) {}
    var d = document.createElement('div'); d.className = 'sf-bg'; d.setAttribute('aria-hidden', 'true'); d.dataset.bg = BGS[i];
    d.style.cssText = 'position:absolute;inset:-14px;pointer-events:none;background:#050507 center/cover no-repeat url("/setter/avatar/bg/' + BGS[i] + '.webp");filter:blur(1.6px) brightness(.92);opacity:0;transition:opacity .6s ease';
    host.parentNode.insertBefore(d, host.parentNode.firstChild); return d;
  }
  function startFace() {
    if (!bgEl) bgEl = backdrop();
    var msg = $('loadMsg'); msg.hidden = false; msg.textContent = 'Connecting live face…';
    return loadAvatarLib().then(function (A) {
      return Promise.race([
        A.start($('avatarHost'), FACE_ID, function (p) { if (p && p.type === 'downloading') msg.textContent = 'Loading Artemis…'; },
          function (kind, v) { if (kind === 'conversation') { face.playing = (v === 'playing'); if (face.playing) face.everPlayed = true; }
            if (kind === 'connection') face.conn = v; if (kind === 'error') console.warn('[spatius]', v);
            if (kind === 'connection' && v === 'failed') faceDown('connection failed'); }),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('avatar_start_timeout')); }, 30000); })
      ]);
    }).then(function (ctrl) { face.on = true; face.ctrl = ctrl; $('phone').dataset.face = 'on'; msg.hidden = true; if (bgEl) bgEl.style.opacity = '1'; $('modeNote').textContent = 'Voice: ElevenLabs v3 · Face: Spatius (live)'; })
      .catch(function (e) { console.warn('[face fallback]', e && e.message); face.on = false; msg.hidden = true; $('phone').dataset.face = 'off'; $('modeNote').textContent = 'Voice: ElevenLabs v3 · face unavailable on this device, audio only'; });
  }
  function faceDown(why) {
    if (!face.on) return; console.warn('[face] falling back to audio only:', why);
    face.on = false; try { window.WSAvatar && window.WSAvatar.stop(); } catch (e) {}
    $('phone').dataset.face = 'off'; if (bgEl) bgEl.style.opacity = '0';
    $('modeNote').textContent = (live && live.ready ? 'Live · ElevenLabs v3 Conversational' : 'Voice: ElevenLabs v3') + ' · face dropped (' + why + '), audio only';
  }
  function speakBuf(buf) {
    var secs = buf.byteLength / 2 / RATE;
    if (face.on && window.WSAvatar && window.WSAvatar.speak(buf)) {
      // Watchdog: if the avatar never starts playing (lip-sync stream blocked), replay the same line as plain audio.
      // Watchdog: trust the avatar only if its audio clock actually advances (the lip-sync stream can be blocked by networks).
      return new Promise(function (r) {
        var start = window.WSAvatar.audioTime ? window.WSAvatar.audioTime() : 0, waited = 0;
        var iv = setInterval(function () {
          waited += 250;
          var now = window.WSAvatar.audioTime ? window.WSAvatar.audioTime() : 0;
          if (now - start > 0.4) { clearInterval(iv); setTimeout(r, Math.max(0, secs * 1000 - waited) + 600); return; }
          if (waited >= 3000) { clearInterval(iv); faceDown('lip-sync stream did not start'); playPCM(buf).then(r); }
        }, 250);
      });
    }
    return playPCM(buf);
  }

  /* ---------------- live agent: Artemis on ElevenLabs Conversational (eleven_v3_conversational) ---------------- */
  var AGENT = 'agent_4001m3dtmz7gfcbvqz0yxw5h2dq5';
  var WS_URL = 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=' + AGENT;
  var live = null; // one live call at a time
  window.WSLive = function () { return live ? { ready: live.ready, mic: !!live.mic, muted: live.muted, audioChunks: live.audioChunks, tools: live.tools, turns: live.turns } : null; }; // QA handle
  function b64ToBuf(b64) { var s = atob(b64), n = s.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  function bufToB64(buf) { var u = new Uint8Array(buf), s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
  function clean(t) { return String(t || '').replace(/\[[^\]]{1,40}\]\s*/g, '').replace(/\s*[—–]\s*/g, ', ').replace(/\s{2,}/g, ' ').trim(); } // no em/en dashes in visible captions

  // streaming WebAudio sink (face off, or face failed its lip-sync check)
  var sink = { head: 0, srcs: [] };
  function sinkPlay(buf) {
    var ctx = audio(), i16 = new Int16Array(buf.byteLength % 2 ? buf.slice(0, buf.byteLength - 1) : buf);
    if (!i16.length) return;
    var ab = ctx.createBuffer(1, i16.length, RATE), ch = ab.getChannelData(0);
    for (var i = 0; i < i16.length; i++) ch[i] = i16[i] / 32768;
    var s = ctx.createBufferSource(); s.buffer = ab; s.connect(analyser);
    var t = Math.max(ctx.currentTime + 0.05, sink.head); s.start(t); sink.head = t + ab.duration;
    sink.srcs.push(s); s.onended = function () { var k = sink.srcs.indexOf(s); if (k >= 0) sink.srcs.splice(k, 1); };
  }
  function sinkFlush() { sink.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} }); sink.srcs = []; sink.head = 0; }

  // face route: hold one chunk back so the final chunk of each reply can be flagged end=true after a short gap
  var fr = { held: null, gap: null, turn: [], verified: false, iv: null };
  function faceChunk(buf) {
    if (fr.held && !window.WSAvatar.push(fr.held, false)) { // avatar refused audio: drop the face, replay this reply as plain audio
      var replay = fr.verified ? [fr.held] : fr.turn.slice(); fr.held = null; fr.turn = []; clearTimeout(fr.gap);
      if (fr.iv) { clearInterval(fr.iv); fr.iv = null; }
      faceDown('avatar not accepting audio'); replay.forEach(sinkPlay); sinkPlay(buf); return;
    }
    fr.held = buf; clearTimeout(fr.gap); fr.gap = setTimeout(faceFlush, 1200); // 28 Sep: 380 ms split replies (agent audio gaps reach ~700 ms) and cut her first sentence
    if (!fr.verified) { fr.turn.push(buf); if (!fr.iv) faceCheck(); }
  }
  function faceFlush() { if (fr.held && face.on && window.WSAvatar && !window.WSAvatar.push(fr.held, true)) sinkPlay(fr.held); fr.held = null; }
  function faceCheck() { // trust the avatar only once its audio clock actually moves; otherwise replay this reply as plain audio
    var prev = window.WSAvatar.audioTime(), t0c = Date.now(); // wall clock, so a busy main thread can't stretch the deadline
    fr.iv = setInterval(function () {
      var now = window.WSAvatar.audioTime();
      if (face.playing || now > prev + 0.05) { clearInterval(fr.iv); fr.iv = null; fr.verified = true; fr.turn = []; return; }
      prev = now;
      if (Date.now() - t0c >= 3000) {
        clearInterval(fr.iv); fr.iv = null; var replay = fr.turn.slice(); fr.turn = []; clearTimeout(fr.gap); fr.held = null;
        faceDown('lip-sync stream did not start'); replay.forEach(sinkPlay);
      }
    }, 200);
  }
  function agentAudio(buf) { if (face.on && window.WSAvatar && window.WSAvatar.push) faceChunk(buf); else sinkPlay(buf); }
  function agentHush() {
    sinkFlush(); clearTimeout(fr.gap); fr.held = null; fr.turn = [];
    if (fr.iv) { clearInterval(fr.iv); fr.iv = null; }
    if (face.on && window.WSAvatar) { try { window.WSAvatar.interrupt ? window.WSAvatar.interrupt() : window.WSAvatar.stop(); } catch (e) {} }
  }

  // mic -> 16 kHz PCM16 frames
  var micModule = null;
  function startMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.AudioWorkletNode) return Promise.reject(new Error('no_mic_api'));
    var ctx = audio();
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })
      .then(function (stream) {
        micModule = micModule || ctx.audioWorklet.addModule('/setter/mic-worklet.js?v=3');
        return micModule.then(function () {
          var src = ctx.createMediaStreamSource(stream), node = new AudioWorkletNode(ctx, 'ws-mic'), zero = ctx.createGain();
          zero.gain.value = 0; src.connect(node); node.connect(zero); zero.connect(ctx.destination); // keep the node pulled, output silent
          return { stream: stream, src: src, node: node, zero: zero };
        }, function (e) { stream.getTracks().forEach(function (t) { t.stop(); }); throw e; });
      });
  }
  function stopMic(m) { if (!m) return; try { m.node.port.onmessage = null; m.src.disconnect(); m.node.disconnect(); m.zero.disconnect(); } catch (e) {} m.stream.getTracks().forEach(function (t) { t.stop(); }); }

  function firstName(n) { return String(n || '').trim().split(/\s+/)[0].replace(/[^A-Za-zÀ-ɏ'\-]/g, '').slice(0, 24); }
  function pilotLine(name) {
    return 'Hey' + (name ? ' ' + name : '') + ", it's Artemis from Witchcraft Setter. You just asked us for a pilot, so this is exactly what your leads would get, seconds after they opt in. I'm an AI, and someone from our team will follow up with you personally today. Want me to show you how I'd qualify one of your leads, or ask me anything about the pilot?";
  }
  function lsend(o) { if (live && live.ws && live.ws.readyState === 1) live.ws.send(JSON.stringify(o)); }
  var capLines = { you: '', her: '' };
  function liveCaption(who, text) {
    capLines[who] = text; if (who === 'her') capLines.you = capLines.you && capLines.youAt && Date.now() - capLines.youAt < 12000 ? capLines.you : '';
    if (who === 'you') capLines.youAt = Date.now();
    var c = $('captions'); c.innerHTML = '';
    if (capLines.you) { var a = document.createElement('span'); a.className = 'you'; a.textContent = 'You: ' + capLines.you; c.appendChild(a); c.appendChild(document.createElement('br')); }
    if (capLines.her) { var b = document.createElement('span'); b.textContent = capLines.her; c.appendChild(b); }
  }
  function flash(id) { var el = $(id); el.classList.remove('upd'); void el.offsetWidth; el.classList.add('upd'); }
  var STAGES = { goal: 'qualify: goal', current: 'qualify: now', timeline: 'qualify: timeline', decision: 'qualify: decision', opener: 'qualify: opener' };
  function crmUpdate(p) {
    var put = function (id, v, n) { if (v == null || v === '') return; set(id, String(v).slice(0, n)); flash(id); };
    put('fGoal', p.goal, 90); put('fNow', p.current, 70); put('fTime', p.timeline, 50); put('fDec', p.decision, 60); put('fNext', p.next_step, 90);
    if (p.objection) { obj(String(p.objection).slice(0, 30)); flash('fObj'); }
    if (p.score != null && isFinite(+p.score)) { st.score = Math.max(0, Math.min(100, Math.round(+p.score))); set('fScore', st.score); $('fBar').style.width = st.score + '%'; }
    if (p.stage) {
      var s = String(p.stage).toLowerCase().slice(0, 24); stage(STAGES[s] || s);
      var ev = { booked: 'demo_booked', transfer: 'demo_transfer', 'opted-out': 'demo_optout' }[s];
      if (ev && live && !live.logged[ev]) { live.logged[ev] = 1; logEvent(ev); }
    }
  }
  function onAgentMsg(L, m) {
    switch (m.type) {
      case 'ping': var pe = m.ping_event || {}; lsend({ type: 'pong', event_id: pe.event_id }); break;
      case 'audio':
        var a = m.audio_event || {}; if (a.event_id != null && a.event_id <= L.lastInt) break;
        if (a.audio_base_64) { L.audioChunks++; var buf = b64ToBuf(a.audio_base_64); if (L.ready) agentAudio(buf); else L.pending.push(buf); }
        break;
      case 'interruption': var ie = m.interruption_event || {}; if (ie.event_id != null) L.lastInt = ie.event_id; L.pending = []; agentHush(); break;
      case 'agent_response': var t = clean((m.agent_response_event || {}).agent_response); if (t) { L.turns++; liveCaption('her', t); } break;
      case 'agent_response_correction': var c = clean((m.agent_response_correction_event || {}).corrected_agent_response); if (c) liveCaption('her', c); break;
      case 'user_transcript': var u = ((m.user_transcription_event || {}).user_transcript || '').trim(); if (u.replace(/[.\s\u2026]/g, '')) liveCaption('you', u.replace(/^\.{3}\s*/, '')); break;
      case 'client_tool_call':
        var tc = m.client_tool_call || {}, res = 'ok', err = false;
        if (tc.tool_name === 'update_crm') { L.tools++; try { crmUpdate(tc.parameters || {}); } catch (e) { res = 'error: ' + (e && e.message); err = true; } }
        else { res = 'unknown tool'; err = true; }
        lsend({ type: 'client_tool_result', tool_call_id: tc.tool_call_id, result: res, is_error: err });
        break;
    }
  }
  function openLive(mode, name) { // resolves once ElevenLabs has accepted the session
    return new Promise(function (resolve, reject) {
      var L = live = { ws: null, ready: false, pending: [], lastInt: -1, mic: null, muted: false, audioChunks: 0, tools: 0, turns: 0, logged: {}, closedByUs: false, ok: false };
      var to = setTimeout(function () { if (!L.ok) { try { L.ws.close(); } catch (e) {} reject(new Error('ws_timeout')); } }, 9000);
      try { L.ws = new WebSocket(WS_URL); } catch (e) { clearTimeout(to); return reject(e); }
      L.ws.onopen = function () {
        var init = { type: 'conversation_initiation_client_data' };
        if (mode === 'pilot') init.conversation_config_override = { agent: { first_message: pilotLine(firstName(name)) } };
        L.ws.send(JSON.stringify(init));
      };
      L.ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.type === 'conversation_initiation_metadata') { L.ok = true; clearTimeout(to); resolve(L); return; }
        if (live === L) onAgentMsg(L, m);
      };
      L.ws.onerror = function () { if (!L.ok) { clearTimeout(to); reject(new Error('ws_error')); } };
      L.ws.onclose = function (e) { if (!L.ok) { clearTimeout(to); reject(new Error('ws_closed_' + e.code)); } else if (live === L) liveEnded(L, e); };
    });
  }
  function liveReady(L) {
    L.ready = true; var q = L.pending; L.pending = []; q.forEach(agentAudio);
    if (L.mic) {
      L.mic.node.port.onmessage = function (e) { if (live === L && L.ws.readyState === 1) L.ws.send(JSON.stringify({ user_audio_chunk: bufToB64(e.data) })); };
      $('muteBtn').hidden = false; $('muteBtn').textContent = 'Mute mic'; $('muteBtn').setAttribute('aria-pressed', 'false');
    }
    setState('live', 'Live'); t0 = Date.now(); clock(); clearInterval(timer); timer = setInterval(clock, 500);
    stage('qualify: opener'); set('fNext', 'Qualify');
    chips(['Is this a bot?', 'How much is it?', 'Just send me the info', 'How does the pilot work?']); inputOn(true);
    $('sayIn').placeholder = L.mic ? 'Talk, or type as the lead…' : 'Type as the lead…';
    $('startBtn').textContent = 'End call';
    $('modeNote').textContent = 'Live · ElevenLabs v3 Conversational' + (face.on ? ' · Spatius face' : '') + (L.mic ? ' · mic on' : ' · mic off: tap or type');
  }
  function liveCleanup(L) { stopMic(L.mic); L.mic = null; agentHush(); $('muteBtn').hidden = true; $('startBtn').textContent = 'Start the call'; $('sayIn').placeholder = 'Reply as the lead…'; if (live === L) live = null; }
  function liveEnded(L, e) { var byUs = L.closedByUs; liveCleanup(L); end(byUs ? 'Call ended.' : 'Artemis ended the call' + (e && e.code && e.code !== 1000 ? ' (' + e.code + ')' : '') + '.'); }
  function hangUp() { var L = live; if (!L) return; L.closedByUs = true; try { L.ws.close(1000); } catch (e) {} if (live === L) liveEnded(L); }
  function sendText(t) { t = String(t || '').trim().slice(0, 500); if (!t || !live || !live.ready) return; $('sayIn').value = ''; liveCaption('you', t); lsend({ type: 'user_message', text: t }); }

  /* ---------------- the call ---------------- */
  var st = null, t0 = 0, timer = null, busy = false;
  var phone = $('phone');
  function clock() { var s = Math.floor((Date.now() - t0) / 1000); $('callClock').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function setState(s, label) { phone.dataset.state = s; $('callState').textContent = label; }
  function set(id, v) { $(id).textContent = v; }
  function score(d) { st.score = Math.max(0, Math.min(100, st.score + d)); set('fScore', st.score); $('fBar').style.width = st.score + '%'; }
  function obj(o) { if (st.objs.indexOf(o) < 0) st.objs.push(o); set('fObj', st.objs.join(', ') + ' (handled)'); }
  function stage(s) { st.stage = s; set('stageTag', s); }
  function chips(list) { var c = $('chips'); c.innerHTML = ''; (list || []).forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t; b.onclick = function () { reply(t); }; c.appendChild(b); }); }
  function inputOn(on) { $('sayIn').disabled = !on; $('sayBtn').disabled = !on; }
  function caption(text) { var c = $('captions'); c.innerHTML = ''; if (!text) return; var s = document.createElement('span'); s.textContent = text; c.appendChild(s); }
  function say(names, opts) {
    busy = true; chips([]); inputOn(false);
    var text = names.map(function (n) { return LINES[n]; }).join(' ');
    caption(text);
    return Promise.all(names.map(clip)).then(function (bufs) { return speakBuf(concat(bufs)); })
      .catch(function (e) { console.warn('[voice]', e); return new Promise(function (r) { setTimeout(r, 2500); }); })
      .then(function () { busy = false; if (st && st.stage !== 'done') { chips(opts || st.opts || []); inputOn(true); } });
  }
  function sysNote(t) { set('fNext', t); }
  function ring(mode, firstTouchMs, name) {
    if (live) hangUp();
    clearInterval(timer); caption(''); capLines.you = capLines.her = ''; chips([]); inputOn(false);
    st = { mode: mode, stage: 'ringing', score: 20, objs: [], opts: [], name: name || '' };
    $('incoming').querySelector('.small').textContent = 'Incoming call · ' + (mode === 'pilot' ? 'Witchcraft Setter' : 'Northstar Coaching');
    ['fGoal', 'fNow', 'fTime', 'fDec', 'fObj', 'fNext'].forEach(function (id) { set(id, '·'); }); score(0);
    set('fSrc', mode === 'pilot' ? 'Pilot form · this page' : 'Lead form · demo');
    $('incoming').hidden = false; setState('ringing', 'Incoming');
    $('ftouch').textContent = firstTouchMs != null ? ('Called back ' + (firstTouchMs / 1000).toFixed(1) + ' s after you hit send') : 'A lead just opted in. First touch: 7 s.';
    stage('ringing');
  }
  // Answer = live Artemis (mic + websocket + face, all started in parallel). Scripted v3 lines only if the live line can't connect.
  function answer() {
    audio(); // unlock audio inside the tap
    $('incoming').hidden = true; setState('connecting', 'Connecting'); caption(''); logEvent('call_answered');
    var mode = st.mode, name = st.name, myRun = st;
    var faceP = ($('faceTog').checked && !face.on) ? startFace() : Promise.resolve();
    var micP = startMic().catch(function (e) { console.warn('[mic]', e && (e.name || e.message)); return null; });
    var liveP = openLive(mode, name); liveP.catch(function () {});
    $('modeNote').textContent = 'Connecting to Artemis…';
    Promise.all([faceP, micP]).then(function (r) {
      var mic = r[1];
      liveP.then(function (L) {
        if (live !== L || st !== myRun) { stopMic(mic); return; } // hung up while connecting
        L.mic = mic; liveReady(L);
      }, function (e) {
        console.warn('[live -> scripted fallback]', e && e.message); stopMic(mic); live = null;
        if (st === myRun && st.stage !== 'done') scripted(mode);
      });
    });
  }
  function scripted(mode) {
    setState('live', 'Live'); t0 = Date.now(); clock(); clearInterval(timer); timer = setInterval(clock, 500);
    $('modeNote').textContent = 'Live line unavailable · scripted ElevenLabs v3 lines' + (face.on ? ' · Spatius face' : '');
    stage('qualify: opener'); st.opts = ['Yeah, go for it', 'Is this a bot?', 'How much is it?', 'Just send me the info'];
    set('fNext', 'Qualify'); say([mode === 'pilot' ? 'L21_pilot' : 'L01_open']);
  }
  function end(note) { clearInterval(timer); timer = null; setState('ended', 'Ended'); stage('done'); chips(['Run it again']); inputOn(false); if (note) sysNote(note); $('chips').firstChild.onclick = function () { ring('demo'); }; }
  $('answerBtn').addEventListener('click', answer);
  $('declineBtn').addEventListener('click', function () { $('incoming').hidden = true; setState('ended', 'Declined'); caption('Declined. In production she would follow up by text, then email, inside legal hours.'); chips(['Run it again']); $('chips').firstChild.onclick = function () { ring('demo'); }; });
  $('startBtn').addEventListener('click', function () { if (live) { hangUp(); return; } audio(); ring('demo'); });
  $('muteBtn').addEventListener('click', function () {
    if (!live || !live.mic) return; live.muted = !live.muted; live.mic.node.port.postMessage({ mute: live.muted });
    this.setAttribute('aria-pressed', String(live.muted)); this.textContent = live.muted ? 'Unmute mic' : 'Mute mic';
  });
  $('sayForm').addEventListener('submit', function (e) { e.preventDefault(); reply($('sayIn').value); });

  var R = {
    stop: /\b(stop|unsubscribe|don'?t (call|text|message)|do not (call|contact)|remove me|leave me alone)\b/i,
    bot: /\b(bot|robot|a\.?i\.?|real person|human|machine|automated)\b/i,
    price: /(\bprice|\bcost|how much|expensive|afford|pricing|\bfees?\b|\bcharge)/i,
    info: /(\bsend\b|\bemail\b|\binfo\b|details|brochure|\bpdf\b|website|\blink\b)/i,
    think: /(think about|\blater\b|not now|\bbusy\b|another time|call me back|driving)/i,
    already: /(already (have|got|work)|have (a|someone)|my (coach|agency|team))/i,
    cont: /(keep going|continue|carry on|go on|ask away)/i,
    yes: /\b(yes|yeah|yep|sure|ok|okay|go|fine|alright|absolutely|definitely|i am|i'm the)\b/i,
    no: /\b(no|nope|not really|nah)\b/i
  };
  var Q = { 'qualify: goal': 'L06_goal', 'qualify: now': 'L07_now', 'qualify: timeline': 'L08_time', 'qualify: decision': 'L09_decide' };
  var OPTS = {
    'qualify: goal': ['Consistent $30k months', 'Get my first 10 clients', 'Replace my 9-to-5'],
    'qualify: now': ['About $8k a month', 'Just starting, $0', 'Around $20k'],
    'qualify: timeline': ['This month', 'This quarter', 'Just exploring'],
    'qualify: decision': ["Yes, it's my call and I have budget", "I'd need to ask my partner", 'Budget is tight']
  };
  function reask(prefix) { if (st.stage === 'qualify: opener') stage('qualify: goal'); var q = Q[st.stage]; if (!q) return false; st.opts = OPTS[st.stage]; say((prefix || []).concat([q])); return true; }
  function transfer(why) { stage('done'); set('fNext', 'Live transfer · ' + why); say(['L15_transfer']).then(function () { end('Warm transfer → closer (Marcus). Whisper: ' + [$('fGoal').textContent, $('fNow').textContent, $('fTime').textContent, $('fDec').textContent].filter(function (x) { return x && x !== '·'; }).join(' | ')); }); }
  function reply(text) {
    if (live && live.ready) { sendText(text); return; }
    text = String(text || '').trim(); if (!st || busy || !text || st.stage === 'done' || st.stage === 'ringing') return;
    $('sayIn').value = ''; caption('You: ' + text);
    var t = text, inBook = (st.stage === 'book' || st.stage === 'hot');
    if (R.stop.test(t)) { score(-100); set('fNext', 'Opted out · do-not-contact on all channels'); stage('done'); say(['L16_stop']).then(function () { end('Opt-out honoured on all channels. Logged for compliance.'); }); return; }
    if (st.pendingHuman && /human|person|coach|transfer|get me/i.test(t)) { st.pendingHuman = false; transfer('on request'); return; }
    if (st.pendingHuman && R.cont.test(t)) { st.pendingHuman = false; if (reask(['L19_perfect'])) return; }
    st.pendingHuman = false;
    if (!inBook) {
      if (R.bot.test(t)) { obj('asked if AI'); st.pendingHuman = true; st.opts = ['Keep going', 'Get me a human']; say(['L02_ai']); return; }
      if (R.price.test(t)) { obj('price'); score(4); reask(['L03_price']); return; }
      if (R.info.test(t)) { obj('send info'); reask(['L04_info']); return; }
      if (R.think.test(t)) { obj('timing'); st.opts = ['Later today', 'Tomorrow morning', "Let's just do it now"]; stage('book'); set('fNext', 'Book callback'); say(['L17_later']); return; }
      if (R.already.test(t)) { obj('already has provider'); score(2); reask(['L05_already']); return; }
      if (R.cont.test(t) && st.stage !== 'qualify: opener') { if (reask([])) return; }
    }
    switch (st.stage) {
      case 'qualify: opener':
        if (R.no.test(t) && !R.yes.test(t)) { st.opts = ['Tomorrow morning', 'Later today', 'Stop']; stage('book'); say(['L18_when']); return; }
        score(5); reask(['L19_perfect']); return;
      case 'qualify: goal': set('fGoal', t.slice(0, 80)); score(15); stage('qualify: now'); st.opts = OPTS[st.stage]; say(['L07_now']); return;
      case 'qualify: now': set('fNow', t.slice(0, 60)); score(10); stage('qualify: timeline'); st.opts = OPTS[st.stage]; say(['L08_time']); return;
      case 'qualify: timeline':
        var hot = /(now|asap|this month|this week|today|immediately|yesterday)/i.test(t), cold = /(explor|someday|not sure|just looking|next year)/i.test(t);
        set('fTime', t.slice(0, 40) + (hot ? ' · HOT' : cold ? ' · nurture' : ' · warm')); score(hot ? 25 : cold ? -5 : 12); stage('qualify: decision'); st.opts = OPTS[st.stage]; say(['L09_decide']); return;
      case 'qualify: decision':
        var partner = /partner|wife|husband|boss|ask/i.test(t), tight = /tight|no budget|can'?t|broke/i.test(t), dm = R.yes.test(t) && !partner && !tight;
        set('fDec', dm ? 'Decision-maker · budget set' : partner ? 'Needs partner on call' : tight ? 'Budget tight' : t.slice(0, 40)); score(dm ? 25 : partner ? 5 : tight ? -10 : 5);
        if (partner) { st.opts = ['Tomorrow 6pm', 'Thursday 7pm']; stage('book'); set('fNext', 'Book with partner'); say(['L12_partner']); return; }
        if (st.score >= 80) { stage('hot'); set('fNext', 'Offer live transfer'); st.opts = ['Put me through', 'Book a time instead']; say(['L10_hot']); return; }
        if (st.score < 45) { stage('done'); set('fNext', 'Nurture: free training sent, re-qualify in 14 days'); say(['L13_nurture']).then(function () { end('Routed to nurture. The closer’s calendar is protected for ready buyers.'); }); return; }
        stage('book'); set('fNext', 'Book strategy call'); st.opts = ['Today 3:30pm', 'Tomorrow 10:00am', 'Tomorrow 1:15pm']; say((tight ? ['L20_tight'] : []).concat(['L11_slots'])); return;
      case 'hot':
        if (/through|now|yes|sure|ok|yeah|transfer/i.test(t) && !/instead|book/i.test(t)) { transfer('score ' + st.score); return; }
        stage('book'); st.opts = ['Today 3:30pm', 'Tomorrow 10:00am', 'Tomorrow 1:15pm']; say(['L11_slots']); return;
      case 'book':
        if (/do it now|\bnow\b/i.test(t)) { transfer('lead asked'); return; }
        var slot = t.match(/(today|tomorrow|thursday|monday|tuesday|wednesday|friday|saturday|sunday|later today|morning)[^,.!?]*/i); slot = slot ? slot[0] : t.slice(0, 30);
        set('fNext', 'Booked: ' + slot + ' · reminders armed'); score(5); stage('done');
        say(['L14_booked']).then(function () { end('Calendar event · CRM updated · reminder cadence armed · no-show rescue on standby.'); logEvent('demo_booked'); }); return;
    }
  }

  /* ---------------- pilot form -> Pages Function -> D1 ---------------- */
  var leadId = null;
  function logEvent(type, detail) { if (!leadId) return; try { fetch('/setter/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: leadId, type: type, detail: detail || null }), keepalive: true }); } catch (e) {} }
  $('leadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = $('formMsg'), btn = $('leadBtn');
    var data = Object.fromEntries(new FormData(f).entries());
    if (!data.name || !data.email) { msg.textContent = 'Name and email, please.'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { msg.textContent = 'That email doesn’t look right.'; return; }
    if (!f.consent.checked) { msg.textContent = 'Tick the consent box so we’re allowed to contact you.'; return; }
    audio();
    var sent = performance.now(), eventId = (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    var payload = Object.assign({}, data, attribution(), { consent: true, consent_text: $('consentText').textContent.trim(), event_id: eventId });
    btn.disabled = true; msg.textContent = 'Sending…';
    fetch('/setter/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) { btn.disabled = false; msg.textContent = res.j && res.j.error === 'rate_limited' ? 'Too many tries from this connection. Try again in a few minutes.' : 'Couldn’t send that. Please email hecate@witch.codes.'; return; }
        leadId = res.j.id;
        if (window.fbq) try { fbq('track', 'Lead', {}, { eventID: eventId }); } catch (x) {}
        var ms = Math.round(performance.now() - sent);
        msg.textContent = 'Got it. Artemis is calling you on this page now ↑';
        ring('pilot', ms, data.name); logEvent('first_touch', String(ms));
        document.getElementById('call').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      })
      .catch(function () { btn.disabled = false; msg.textContent = 'Network error. Please try again or email hecate@witch.codes.'; });
  });

})();
