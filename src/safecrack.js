// Minijuegos para abrir la caja fuerte del saqueo (en vez de esperar quieta 6 segundos). Uno al azar:
//  · La rueda: la aguja gira y hay que tocar Recoger cuando pasa por la marca, tres números (cada uno en sentido
//    contrario y algo más deprisa). Fallar suena: un golpe metálico que los Escorpiones pueden oír, y la marca cambia.
//  · Los pernos: cuatro pernos; un indicador sube y baja por cada uno y hay que tocar Recoger cuando está en la
//    franja (cinco). Fallar suena y el último perno que habías encajado se vuelve a caer.
// El juego sigue mientras tanto (no se pausa): si te mueves, te pegan o te alejas, se corta (lo decide el modo).
(function (G) {
  'use strict';
  const TAU = Math.PI * 2;
  let A = null, cv = null, ctx = null, box = null, txt = null;

  function el() {
    if (box) return;
    box = document.createElement('div');
    box.id = 'crack';
    box.className = 'hidden';
    cv = document.createElement('canvas');
    cv.width = 360; cv.height = 360;
    txt = document.createElement('div');
    txt.className = 'crack-tx';
    box.appendChild(cv); box.appendChild(txt);
    document.body.appendChild(box);
    ctx = cv.getContext('2d');
  }

  // tier: dificultad (0 a 1): más rápida y con la marca más estrecha. noise(r): ha sonado (radio en m)
  function start(o) {
    el();
    const kind = o.kind || (Math.random() < 0.5 ? 'dial' : 'pins'), k = Math.max(0, Math.min(1, o.tier || 0));
    A = { kind, k, noise: o.noise || (() => {}), t: 0, done: false, flash: 0, flashOk: false, msgT: 0 };
    if (kind === 'dial') {
      A.n = 0; A.need = 3; A.ang = Math.random() * TAU; A.dir = 1; A.sp = 2.1 + 0.8 * k;
      A.w = 0.62 - 0.2 * k; A.set = [];
      newMark();
    } else {
      A.n = 0; A.need = 5; A.y = 0; A.v = 1; A.sp = 0.95 + 0.4 * k;
      A.band = [0.68, 0.68 + (0.2 - 0.06 * k)];
      A.lo = 0.1;
    }
    box.classList.remove('hidden');
    txt.textContent = kind === 'dial' ? 'La rueda: toca Recoger cuando la aguja pase por la marca' : 'Los pernos: toca Recoger cuando el indicador esté en la franja';
    A.msgT = 2.2;
    draw();
    return A;
  }
  function newMark() {
    // la marca, lejos de donde está la aguja (que dé tiempo a verla venir)
    A.mark = A.ang + A.dir * (3 + Math.random() * 2.2);
  }
  function stop() {
    A = null;
    if (box) box.classList.add('hidden');
  }

  function press() {
    if (!A || A.done || A.hold > 0) return;
    if (A.kind === 'dial') {
      const d = Math.abs(((A.ang - A.mark) % TAU + TAU * 1.5) % TAU - Math.PI);
      if (d <= A.w / 2) {
        A.set.push(A.mark); A.n++; A.flash = 0.25; A.flashOk = true; A.hold = 0.45;
        if (G.Audio) G.Audio.play('slide', { vol: 0.5 });
        if (A.n >= A.need) A.done = true;
        else { A.dir = -A.dir; A.sp *= 1.15; newMark(); }
      } else miss();
    } else {
      if (A.y >= A.band[0] && A.y <= A.band[1]) {
        A.n++; A.flash = 0.25; A.flashOk = true; A.y = 0; A.v = 1; A.hold = 0.4;
        if (G.Audio) G.Audio.play('slide', { vol: 0.5 });
        if (A.n >= A.need) A.done = true;
        else A.sp *= 1.12;
      } else {
        miss();
        if (A.n > 0) A.n--;              // (el último que habías encajado se cae)
      }
    }
    draw();
  }
  function miss() {
    A.flash = 0.35; A.flashOk = false;
    if (G.Audio) G.Audio.play('hitBlunt', { vol: 0.7 });
    A.noise(9);
    if (A.kind === 'dial') newMark();
    txt.textContent = 'Ha sonado... con calma';
    A.msgT = 1.4;
  }

  // devuelve 'done' al abrirla
  function update(dt) {
    if (!A) return null;
    A.t += dt;
    if (A.flash > 0) A.flash -= dt;
    if (A.msgT > 0) { A.msgT -= dt; if (A.msgT <= 0) txt.textContent = A.kind === 'dial' ? 'Número ' + Math.min(A.need, A.n + 1) + ' de ' + A.need : 'Perno ' + Math.min(A.need, A.n + 1) + ' de ' + A.need; }
    if (A.done) return 'done';
    // (tras encajar uno, un respiro: el mecanismo asienta)
    if (A.hold > 0) { A.hold -= dt; draw(); return null; }
    if (A.kind === 'dial') A.ang += A.dir * A.sp * dt;
    else {
      A.y += A.v * A.sp * dt;
      if (A.y >= 1) { A.y = 1; A.v = -1; }
      if (A.y <= 0) { A.y = 0; A.v = 1; }
    }
    draw();
    return null;
  }

  function draw() {
    if (!A || !ctx) return;
    const W = cv.width, H = cv.height, c = ctx;
    c.clearRect(0, 0, W, H);
    const ok = A.flash > 0 ? (A.flashOk ? '#7fd48a' : '#e0402e') : null;
    if (A.kind === 'dial') {
      const cx = W / 2, cy = H / 2, R = W * 0.42;
      // la rueda: acero oscuro con muescas
      c.fillStyle = 'rgba(20,22,26,0.82)'; c.beginPath(); c.arc(cx, cy, R + 14, 0, TAU); c.fill();
      c.strokeStyle = ok || '#8a9098'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(200,205,210,0.5)'; c.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, r0 = R - (i % 5 ? 8 : 16); c.beginPath(); c.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); c.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); c.stroke(); }
      // la marca
      c.strokeStyle = '#e8c46a'; c.lineWidth = 14;
      c.beginPath(); c.arc(cx, cy, R - 4, A.mark - A.w / 2 - Math.PI / 2, A.mark + A.w / 2 - Math.PI / 2); c.stroke();
      // la aguja
      c.strokeStyle = '#fff'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(A.ang) * (R - 12), cy - Math.cos(A.ang) * (R - 12)); c.stroke();
      c.fillStyle = '#b8923a'; c.beginPath(); c.arc(cx, cy, 16, 0, TAU); c.fill();
      // los números ya puestos
      for (let i = 0; i < A.need; i++) { c.fillStyle = i < A.n ? '#7fd48a' : 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(cx + (i - (A.need - 1) / 2) * 26, cy + R * 0.5, 7, 0, TAU); c.fill(); }
    } else {
      // los pernos: una columna por perno; el que toca, con su indicador y su franja
      const n = A.need, pw = 52, gap = 22, x0 = (W - (n * pw + (n - 1) * gap)) / 2, top = 40, hh = H - 90;
      c.fillStyle = 'rgba(20,22,26,0.82)'; c.fillRect(x0 - 18, top - 18, n * pw + (n - 1) * gap + 36, hh + 36);
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (pw + gap), cur = i === A.n;
        c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x, top, pw, hh);
        if (i < A.n) {
          // encajado: arriba, verde
          c.fillStyle = '#7fd48a'; c.fillRect(x + 6, top + hh * (1 - A.band[1]), pw - 12, hh * (A.band[1] - A.band[0]));
        } else if (cur) {
          c.fillStyle = 'rgba(232,196,106,0.45)'; c.fillRect(x, top + hh * (1 - A.band[1]), pw, hh * (A.band[1] - A.band[0]));
          c.strokeStyle = '#e8c46a'; c.lineWidth = 2; c.strokeRect(x, top + hh * (1 - A.band[1]), pw, hh * (A.band[1] - A.band[0]));
          c.fillStyle = ok || '#fff'; c.fillRect(x + 4, top + hh * (1 - A.y) - 5, pw - 8, 10);
        } else { c.fillStyle = 'rgba(200,205,210,0.35)'; c.fillRect(x + 6, top + hh - 28, pw - 12, 22); }
      }
    }
  }

  G.SafeCrack = { start, stop, press, update, get state() { return A; }, get active() { return !!A; }, get label() { return A && A.kind === 'pins' ? 'Encajar' : 'Girar'; } };
})(window.Game = window.Game || {});
