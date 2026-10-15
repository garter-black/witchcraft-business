/* Witchcraft Closers v1: prospect page runtime. No secrets here: the Spatius key stays in the umbra-spatius Worker and the
   ElevenLabs key never leaves the operator's machine. The live call talks to a public, origin-allowlisted ElevenLabs agent
   (Artemis, closer) with per-prospect dynamic variables; the face is the shared Spatius kit served from /setter/avatar/. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AGENT = 'agent_9001m3n4z6x6f66tyvfan1z5y89r';
  var WS_URL = 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=' + AGENT;
  var RATE = 24000;
  var TOKEN = (new URLSearchParams(location.search).get('p') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  var CTX = { first_name: 'there', firm: 'your business', city: 'your area', segment: 'general', hook: 'how their calls are handled after hours' };
  var known = false;

  function ev(type, detail) { try { fetch('/closers/api/e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: TOKEN || 'none', type: type, detail: detail || null }), keepalive: true }); } catch (e) {} }
  function once(type, detail) { var k = 'wc_' + type + '_' + TOKEN; try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) {} ev(type, detail); }

  /* ---------------- personalise ---------------- */
  function personalise(p) {
    known = true;
    CTX = { first_name: p.first || 'there', firm: p.firm, city: p.city || 'your area', segment: p.segment || 'general', hook: p.hook || CTX.hook };
    $('forWho').innerHTML = ''; $('forWho').appendChild(document.createTextNode('Made for ')); var b = document.createElement('b'); b.textContent = p.firm; $('forWho').appendChild(b);
    $('introFor').textContent = 'For ' + p.firm;
    $('hookLine').textContent = p.hook + ' Ask Artemis to play your after-hours line and hear what your callers would get.';
    if (p.segment === 'dental') {
      $('h2line').innerHTML = 'Every <em>consult</em> booked.'; $('h3line').textContent = 'Even at 7pm, even on weekends.';
      $('headline').setAttribute('aria-label', 'Every call answered. Every consult booked. Even at 7pm, even on weekends.');
      $('w1h').textContent = 'A proper front desk';
      $('w1p').textContent = 'What they need, how soon, insurance or financing questions, answered the way you approve. Warm and unhurried.';
    }
    document.title = 'For ' + p.firm + ' | Talk to Artemis';
  }
  if (TOKEN) {
    fetch('/closers/api/p?t=' + encodeURIComponent(TOKEN)).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.ok) personalise(j); once('open', known ? 'known' : 'unknown'); })
      .catch(function () { once('open', 'lookup_failed'); });
  } else { once('open', 'no_token'); }

  /* ---------------- audio ---------------- */
  var actx = null, analyser = null;
  function audio() { if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); analyser = actx.createAnalyser(); analyser.fftSize = 256; analyser.connect(actx.destination); } if (actx.state === 'suspended') actx.resume(); return actx; }
  (function wave() { var c = $('wave'); if (!c) return; var g = c.getContext('2d'), data = new Uint8Array(128);
    function f() { var w = c.clientWidth, h = c.clientHeight; if (c.width !== w) { c.width = w; c.height = h; } g.clearRect(0, 0, w, h);
      if (analyser) analyser.getByteFrequencyData(data); var bars = 48, bw = w / bars;
      for (var i = 0; i < bars; i++) { var v = analyser ? data[i + 2] / 255 : 0.03; var bh = Math.max(2, v * h); g.fillStyle = 'rgba(227,169,162,' + (0.35 + v * .65) + ')'; g.fillRect(i * bw + 1, (h - bh) / 2, bw - 2, bh); }
      requestAnimationFrame(f); } f(); })();
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

  /* ---------------- Spatius live face (shared kit) ---------------- */
  var FACES = { leyla: '8b86dda1-98ed-4acd-8a4e-b1a00ba69268', nadia: '9078fde3-8e55-4311-a8d6-7740185b5b0d', camille: '82d7dce9-ec05-4102-969f-2fe341af28cd', clara: 'd51ab422-3db7-47cc-afa8-7273b02bc70b' };
  var FACE_ID = FACES[new URLSearchParams(location.search).get('face')] || FACES.leyla; // Artemis (closer) = Leyla; the setter keeps Camille
  var face = { on: false, playing: false };
  window.WCFace = face;
  function loadAvatarLib() {
    return new Promise(function (res, rej) {
      if (window.WSAvatar) return res(window.WSAvatar);
      var s = document.createElement('script'); s.type = 'module'; s.src = '/setter/avatar/avatar.js'; // same module instance the wasm chunk imports
      var to = setTimeout(function () { rej(new Error('avatar_lib_timeout')); }, 30000);
      window.addEventListener('wsavatar-ready', function () { clearTimeout(to); res(window.WSAvatar); }, { once: true });
      s.onerror = function () { clearTimeout(to); rej(new Error('avatar_lib_load')); };
      document.head.appendChild(s);
    });
  }
  var BGS = ['uni-office-modern', 'uni-office-oak', 'uni-study-window', 'uni-study-globe'], bgEl = null;
  function backdrop() {
    var host = $('avatarHost'); if (!host || !host.parentNode) return null;
    var i = Math.floor(Math.random() * BGS.length), d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:absolute;inset:-14px;pointer-events:none;background:#050507 center/cover no-repeat url("/setter/avatar/bg/' + BGS[i] + '.webp");filter:blur(1.6px) brightness(.9);opacity:0;transition:opacity .6s ease';
    host.parentNode.insertBefore(d, host.parentNode.firstChild); return d;
  }
  function startFace() {
    if (!bgEl) bgEl = backdrop();
    var msg = $('loadMsg'); msg.hidden = false; msg.textContent = 'Connecting live face…';
    return loadAvatarLib().then(function (A) {
      return Promise.race([
        A.start($('avatarHost'), FACE_ID, function (p) { if (p && p.type === 'downloading') msg.textContent = 'Loading Artemis…'; },
          function (kind, v) { if (kind === 'conversation') { face.playing = (v === 'playing'); }
            if (kind === 'error') console.warn('[spatius]', v);
            if (kind === 'connection' && v === 'failed') faceDown('connection failed'); }),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('avatar_start_timeout')); }, 30000); })
      ]);
    }).then(function () { face.on = true; $('phone').dataset.face = 'on'; msg.hidden = true; if (bgEl) bgEl.style.opacity = '1'; ev('face_ok'); })
      .catch(function (e) { console.warn('[face fallback]', e && e.message); face.on = false; msg.hidden = true; $('phone').dataset.face = 'off'; ev('face_fail', e && e.message); });
  }
  function faceDown(why) {
    if (!face.on) return; console.warn('[face] audio only:', why);
    face.on = false; try { window.WSAvatar && window.WSAvatar.stop(); } catch (e) {}
    $('phone').dataset.face = 'off'; if (bgEl) bgEl.style.opacity = '0'; ev('face_fail', why);
    $('modeNote').textContent = 'Live · voice only (' + why + ')';
  }
  // face route: hold one chunk so the last chunk of each reply is flagged end=true after a gap (1200 ms; agent gaps reach ~700 ms)
  var fr = { held: null, gap: null, turn: [], verified: false, iv: null };
  function faceChunk(buf) {
    if (fr.held && !window.WSAvatar.push(fr.held, false)) {
      var replay = fr.verified ? [fr.held] : fr.turn.slice(); fr.held = null; fr.turn = []; clearTimeout(fr.gap);
      if (fr.iv) { clearInterval(fr.iv); fr.iv = null; }
      faceDown('avatar not accepting audio'); replay.forEach(sinkPlay); sinkPlay(buf); return;
    }
    fr.held = buf; clearTimeout(fr.gap); fr.gap = setTimeout(faceFlush, 1200);
    if (!fr.verified) { fr.turn.push(buf); if (!fr.iv) faceCheck(); }
  }
  function faceFlush() { if (fr.held && face.on && window.WSAvatar && !window.WSAvatar.push(fr.held, true)) sinkPlay(fr.held); fr.held = null; }
  function faceCheck() {
    var prev = window.WSAvatar.audioTime(), t0c = Date.now();
    fr.iv = setInterval(function () {
      var now = window.WSAvatar.audioTime();
      if (face.playing || now > prev + 0.05) { clearInterval(fr.iv); fr.iv = null; fr.verified = true; fr.turn = []; return; }
      prev = now;
      if (Date.now() - t0c >= 3000) { clearInterval(fr.iv); fr.iv = null; var replay = fr.turn.slice(); fr.turn = []; clearTimeout(fr.gap); fr.held = null; faceDown('lip-sync stream did not start'); replay.forEach(sinkPlay); }
    }, 200);
  }
  function agentAudio(buf) { if (face.on && window.WSAvatar && window.WSAvatar.push) faceChunk(buf); else sinkPlay(buf); }
  function agentHush() {
    sinkFlush(); clearTimeout(fr.gap); fr.held = null; fr.turn = [];
    if (fr.iv) { clearInterval(fr.iv); fr.iv = null; }
    if (face.on && window.WSAvatar) { try { window.WSAvatar.interrupt ? window.WSAvatar.interrupt() : window.WSAvatar.stop(); } catch (e) {} }
  }

  /* ---------------- mic ---------------- */
  var micModule = null;
  function startMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.AudioWorkletNode) return Promise.reject(new Error('no_mic_api'));
    var ctx = audio();
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })
      .then(function (stream) {
        micModule = micModule || ctx.audioWorklet.addModule('/setter/mic-worklet.js?v=3');
        return micModule.then(function () {
          var src = ctx.createMediaStreamSource(stream), node = new AudioWorkletNode(ctx, 'ws-mic'), zero = ctx.createGain();
          zero.gain.value = 0; src.connect(node); node.connect(zero); zero.connect(ctx.destination);
          return { stream: stream, src: src, node: node, zero: zero };
        }, function (e) { stream.getTracks().forEach(function (t) { t.stop(); }); throw e; });
      });
  }
  function stopMic(m) { if (!m) return; try { m.node.port.onmessage = null; m.src.disconnect(); m.node.disconnect(); m.zero.disconnect(); } catch (e) {} m.stream.getTracks().forEach(function (t) { t.stop(); }); }

  /* ---------------- live agent ---------------- */
  var live = null, t0 = 0, timer = null;
  window.WCLive = function () { return live ? { ready: live.ready, mic: !!live.mic, audioChunks: live.audioChunks, turns: live.turns, tools: live.tools } : null; };
  function b64ToBuf(b64) { var s = atob(b64), n = s.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  function bufToB64(buf) { var u = new Uint8Array(buf), s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
  function clean(t) { return String(t || '').replace(/\[[^\]]{1,40}\]\s*/g, '').replace(/\s*[—–]\s*/g, ', ').replace(/\s{2,}/g, ' ').trim(); }
  function lsend(o) { if (live && live.ws && live.ws.readyState === 1) live.ws.send(JSON.stringify(o)); }
  var cap = { you: '', her: '', youAt: 0 };
  function caption(who, text) {
    cap[who] = text; if (who === 'you') cap.youAt = Date.now(); else if (Date.now() - cap.youAt > 12000) cap.you = '';
    var c = $('captions'); c.innerHTML = '';
    if (cap.you) { var a = document.createElement('span'); a.className = 'you'; a.textContent = 'You: ' + cap.you; c.appendChild(a); c.appendChild(document.createElement('br')); }
    if (cap.her) { var b = document.createElement('span'); b.textContent = cap.her; c.appendChild(b); }
  }
  function setState(s, label) { $('phone').dataset.state = s; $('callState').textContent = label; }
  function clock() { var s = Math.floor((Date.now() - t0) / 1000); $('callClock').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function chips(list) { var c = $('chips'); c.innerHTML = ''; (list || []).forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (t === 'Not interested' ? ' stop' : ''); b.textContent = t; b.onclick = function () { sendText(t === 'Play my after-hours line' ? 'Demo please. Play my after-hours line, I will be the caller.' : t); if (/after-hours/.test(t)) ev('demo'); }; c.appendChild(b); }); }
  function inputOn(on) { $('sayIn').disabled = !on; $('sayBtn').disabled = !on; }
  function sendText(t) { t = String(t || '').trim().slice(0, 500); if (!t || !live || !live.ready) return; $('sayIn').value = ''; caption('you', t); lsend({ type: 'user_message', text: t }); if (/\bdemo\b/i.test(t)) ev('demo'); }

  function book(params) {
    var body = Object.assign({}, params || {}, { t: TOKEN || 'none', source: 'agent' });
    return fetch('/closers/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) { return j && j.ok ? 'saved: Rio will email them within one business day' : 'error: ' + ((j && j.error) || 'unknown') + ' (ask them to use the form on this page)'; })
      .catch(function () { return 'error: network (ask them to use the form on this page)'; });
  }
  function onMsg(L, m) {
    switch (m.type) {
      case 'ping': var pe = m.ping_event || {}; lsend({ type: 'pong', event_id: pe.event_id }); break;
      case 'audio':
        var a = m.audio_event || {}; if (a.event_id != null && a.event_id <= L.lastInt) break;
        if (a.audio_base_64) { L.audioChunks++; var buf = b64ToBuf(a.audio_base_64); if (L.ready) agentAudio(buf); else L.pending.push(buf); }
        break;
      case 'interruption': var ie = m.interruption_event || {}; if (ie.event_id != null) L.lastInt = ie.event_id; L.pending = []; agentHush(); break;
      case 'agent_response': var t = clean((m.agent_response_event || {}).agent_response); if (t) { L.turns++; caption('her', t); } break;
      case 'agent_response_correction': var c = clean((m.agent_response_correction_event || {}).corrected_agent_response); if (c) caption('her', c); break;
      case 'user_transcript': var u = ((m.user_transcription_event || {}).user_transcript || '').trim(); if (u.replace(/[.\s…]/g, '')) caption('you', u.replace(/^\.{3}\s*/, '')); break;
      case 'client_tool_call':
        var tc = m.client_tool_call || {};
        if (tc.tool_name === 'request_meeting') {
          L.tools++;
          book(tc.parameters || {}).then(function (res) { lsend({ type: 'client_tool_result', tool_call_id: tc.tool_call_id, result: res, is_error: /^error/.test(res) }); if (!/^error/.test(res)) { $('modeNote').textContent = 'Sent to Rio ✓'; } });
        } else lsend({ type: 'client_tool_result', tool_call_id: tc.tool_call_id, result: 'unknown tool', is_error: true });
        break;
    }
  }
  function openLive() {
    return new Promise(function (resolve, reject) {
      var L = live = { ws: null, ready: false, pending: [], lastInt: -1, mic: null, muted: false, audioChunks: 0, turns: 0, tools: 0, ok: false, closedByUs: false };
      var to = setTimeout(function () { if (!L.ok) { try { L.ws.close(); } catch (e) {} reject(new Error('ws_timeout')); } }, 9000);
      try { L.ws = new WebSocket(WS_URL); } catch (e) { clearTimeout(to); return reject(e); }
      L.ws.onopen = function () {
        var init = { type: 'conversation_initiation_client_data', dynamic_variables: CTX };
        if (!known) init.conversation_config_override = { agent: { first_message: "Hi! I'm Artemis, the AI sales rep at Witchcraft Business. Yes, an actual AI, which is sort of the point. What kind of business do you run? I'll show you what your after-hours callers could hear." } };
        L.ws.send(JSON.stringify(init));
      };
      L.ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.type === 'conversation_initiation_metadata') { L.ok = true; clearTimeout(to); resolve(L); return; }
        if (live === L) onMsg(L, m); };
      L.ws.onerror = function () { if (!L.ok) { clearTimeout(to); reject(new Error('ws_error')); } };
      L.ws.onclose = function (e) { if (!L.ok) { clearTimeout(to); reject(new Error('ws_closed_' + e.code)); } else if (live === L) ended(L, e); };
    });
  }
  function note(L) { $('modeNote').textContent = 'Live · ElevenLabs' + (face.on ? ' · Spatius face' : ' · voice only') + (L.mic ? ' · mic on' : (L.micWait ? ' · allow the mic to talk, or type' : ' · mic off: type instead')); $('sayIn').placeholder = L.mic ? 'Talk, or type…' : 'Type to Artemis…'; }
  function attachMic(L, m) {
    if (!m) { L.micWait = false; note(L); return; }
    if (live !== L) { stopMic(m); return; }
    L.mic = m; L.micWait = false;
    m.node.port.onmessage = function (e) { if (live === L && L.ws.readyState === 1) L.ws.send(JSON.stringify({ user_audio_chunk: bufToB64(e.data) })); };
    $('muteBtn').hidden = false; note(L); ev('talk_live', 'mic_on');
  }
  function ready(L) { // 29 Sep: go live as soon as the agent + face are up; the mic joins whenever the permission prompt is answered
    L.ready = true; var q = L.pending; L.pending = []; q.forEach(agentAudio);
    setState('live', 'Live'); t0 = Date.now(); clock(); clearInterval(timer); timer = setInterval(clock, 500);
    chips(['Play my after-hours line', 'How much is it?', 'Is it really an AI?', 'Start the free week', 'Not interested']); inputOn(true);
    $('startBtn').textContent = 'End'; note(L);
    ev('talk_live', face.on ? 'face' : 'noface');
  }
  function cleanup(L) { stopMic(L.mic); L.mic = null; agentHush(); $('muteBtn').hidden = true; $('startBtn').textContent = 'Start'; if (live === L) live = null; }
  function ended(L, e) { var byUs = L.closedByUs; cleanup(L); clearInterval(timer); setState('ended', 'Ended'); inputOn(false); chips([]); caption('her', byUs ? 'Call ended. If it was useful, leave your details below and Rio will email you.' : 'Artemis ended the call. Want the free week? Leave your details below.'); ev('talk_end', String(Math.round((Date.now() - t0) / 1000)) + 's'); }
  function hangUp() { var L = live; if (!L) return; L.closedByUs = true; try { L.ws.close(1000); } catch (e) {} if (live === L) ended(L); }
  function start() {
    if (live) { hangUp(); return; }
    audio(); $('intro').hidden = true; setState('connecting', 'Connecting'); $('modeNote').textContent = 'Connecting to Artemis…'; ev('talk_start');
    var faceP = ($('faceTog').checked && !face.on) ? startFace() : Promise.resolve();
    var micP = startMic().catch(function (e) { console.warn('[mic]', e && (e.name || e.message)); return null; });
    var liveP = openLive(); liveP.catch(function () {});
    liveP.then(function (L) { L.micWait = true; micP.then(function (m) { if (live !== L) { stopMic(m); return; } if (L.ready) attachMic(L, m); else L.micLater = m === null ? 'none' : m; }); }, function () { micP.then(stopMic); });
    faceP.then(function () {
      liveP.then(function (L) { if (live !== L) return; ready(L); if (L.micLater) attachMic(L, L.micLater === 'none' ? null : L.micLater); },
        function (e) { live = null; setState('ended', 'Busy'); ev('talk_fail', e && e.message);
          caption('her', 'Artemis can’t take the call right now. Leave your details below and Rio will email you today.'); $('startBtn').textContent = 'Try again'; $('modeNote').textContent = 'Live line unavailable (' + (e && e.message) + ')'; });
    });
  }
  $('bigStart').addEventListener('click', start);
  $('startBtn').addEventListener('click', start);
  $('heroTalk').addEventListener('click', function () { setTimeout(function () { if (!live) $('bigStart').focus(); }, 400); });
  $('muteBtn').addEventListener('click', function () { if (!live || !live.mic) return; live.muted = !live.muted; live.mic.node.port.postMessage({ mute: live.muted }); this.setAttribute('aria-pressed', String(live.muted)); this.textContent = live.muted ? 'Unmute mic' : 'Mute mic'; });
  $('sayForm').addEventListener('submit', function (e) { e.preventDefault(); sendText($('sayIn').value); });

  /* ---------------- form -> Rio ---------------- */
  var focused = false;
  $('bookForm').addEventListener('focusin', function () { if (!focused) { focused = true; ev('form_focus'); } });
  $('bookForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = $('bookMsg'), btn = $('bookBtn'), d = Object.fromEntries(new FormData(f).entries());
    if (!d.name || !d.email) { msg.textContent = 'Name and email, please.'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { msg.textContent = 'That email doesn’t look right.'; return; }
    if (!f.consent.checked) { msg.textContent = 'Tick the box so Rio is allowed to email you.'; return; }
    btn.disabled = true; msg.textContent = 'Sending…';
    var body = Object.assign({}, d, { t: TOKEN || 'none', source: 'form', consent: true });
    fetch('/closers/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok) { msg.textContent = 'Sent. Rio will email you within one business day.'; f.reset(); } else { btn.disabled = false; msg.textContent = j && j.error === 'rate_limited' ? 'Too many tries. Please email hecate@witch.codes.' : 'Couldn’t send that. Please email hecate@witch.codes.'; } })
      .catch(function () { btn.disabled = false; msg.textContent = 'Network error. Please email hecate@witch.codes.'; });
  });
  if (reduce) document.documentElement.classList.add('reduce');
})();
