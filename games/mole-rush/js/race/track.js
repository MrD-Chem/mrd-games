/** One-canvas race. start/correct/wrong/standings/destroy; answers before start
 * or after completion are ignored. See README.md for standings and finish rules.
 * Adds a visible polite live summary after canvas; destroy removes it/listeners.
 * Optional sprite paths resolve relative to the page and must stay same-origin.
 */
const TEAM_COLORS = { A: '#6ee7cf', B: '#c4b5fd' };
const ORDINAL = ['1st', '2nd', '3rd', '4th'];

export function createRace({ canvas, racers, totalSteps, mode = 'solo', reducedMotion, onFinish = () => {} }) {
  if (!canvas || !Array.isArray(racers) || racers.length < 2 || racers.length > 4 ||
      !Number.isSafeInteger(totalSteps) || totalSteps < 1 || totalSteps > Number.MAX_SAFE_INTEGER / 2 ||
      !['solo', 'teams'].includes(mode) || typeof onFinish !== 'function') {
    throw new TypeError('Race needs a canvas, 2–4 racers, positive totalSteps and a valid mode.');
  }
  const ids = new Set();
  for (const racer of racers) {
    if (!racer || typeof racer.id !== 'string' || !racer.id || ids.has(racer.id) ||
        typeof racer.name !== 'string' || typeof racer.color !== 'string' ||
        ![null, 'A', 'B'].includes(racer.team)) {
      throw new TypeError('Racers need unique string ids, names, colors and team A, B or null.');
    }
    ids.add(racer.id);
  }
  if (mode === 'teams' && (racers.length !== 4 ||
      racers.filter(r => r.team === 'A').length !== 2 ||
      racers.filter(r => r.team === 'B').length !== 2)) {
    throw new TypeError('Teams mode requires two racers on each of teams A and B.');
  }
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let quiet = reducedMotion === undefined ? media.matches : Boolean(reducedMotion);
  const lanes = racers.map((r, index) => ({
    id: r.id, name: r.name, color: r.color, isPlayer: Boolean(r.isPlayer), team: r.team,
    index, steps: 0, position: 0, finishOrder: 0, shake: 0, image: null,
    spriteReady: false, label: r.name + (r.isPlayer ? ' · YOU' : '') +
      (mode === 'teams' ? ' · TEAM ' + r.team : ''), counter: '0 / ' + totalSteps
  }));
  const teams = ['A', 'B'].map(team => ({
    team, steps: 0, label: 'TEAM ' + team + '   0 / ' + totalSteps * 2
  }));
  const byId = new Map(lanes.map(r => [r.id, r]));
  const summary = document.createElement('p');
  summary.className = 'race-summary';
  summary.setAttribute('aria-live', 'polite');
  summary.setAttribute('aria-atomic', 'true');
  canvas.after(summary);
  let started = false;
  let ended = false;
  let destroyed = false;
  let finishedCount = 0;
  let winningTeam = null;
  let frameId = null;
  let lastTime = 0;
  let width = 800;
  let height = 540;
  let ratio = 1;

  function standings() {
    if (mode === 'teams') {
      return teams.slice().sort((a, b) => b.steps - a.steps).map((t, i, list) => ({
        team: t.team, place: i && t.steps === list[0].steps ? 1 : i + 1,
        steps: t.steps, totalSteps: totalSteps * 2, finished: t.team === winningTeam,
        members: lanes.filter(r => r.team === t.team).map(r => ({
          id: r.id, name: r.name, steps: r.steps, isPlayer: r.isPlayer,
          finished: r.steps === totalSteps
        }))
      }));
    }
    const sorted = lanes.slice().sort((a, b) => {
      if (a.finishOrder && b.finishOrder) return a.finishOrder - b.finishOrder;
      return b.steps - a.steps || a.index - b.index;
    });
    let place = 1;
    return sorted.map((r, i) => {
      if (i === 0 || r.finishOrder || r.steps !== sorted[i - 1].steps) place = i + 1;
      return { id: r.id, name: r.name, team: r.team, isPlayer: r.isPlayer,
        place, steps: r.steps, totalSteps, finished: Boolean(r.finishOrder) };
    });
  }

  function announce() {
    const order = standings();
    const player = lanes.find(r => r.isPlayer);
    let text = '';
    if (player) {
      const entry = order.find(r => mode === 'teams' ? r.team === player.team : r.id === player.id);
      const tied = order.filter(r => r.place === entry.place).length > 1;
      text = (mode === 'teams' ? 'Your team is ' : 'You are ') +
        (tied ? 'tied for ' : '') + ORDINAL[entry.place - 1] + ' of ' + order.length + '. ';
    }
    text += order.map(r => mode === 'teams'
      ? 'Team ' + r.team + ': ' + r.steps + '/' + r.totalSteps
      : r.name + ': ' + r.steps + '/' + r.totalSteps + (r.finished ? ' (finished ' + ORDINAL[r.place - 1] + ')' : '')
    ).join('; ') + '.';
    if (ended) text += ' Race complete. ' + (mode === 'teams' ? 'Team ' + winningTeam : order[0].name) + ' wins!';
    else if (finishedCount && mode === 'solo') text += ' ' + order[0].name + ' wins; racing continues for the remaining places.';
    summary.textContent = text;
  }

  function circle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function mole(r, x, y) {
    ctx.fillStyle = '#00000040';
    ctx.beginPath();
    ctx.ellipse(x, y + 25, 27, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (r.spriteReady) {
      const scale = 62 / Math.max(r.image.naturalWidth, r.image.naturalHeight);
      const w = r.image.naturalWidth * scale;
      const h = r.image.naturalHeight * scale;
      ctx.drawImage(r.image, x - w / 2, y - h / 2, w, h);
      return;
    }
    circle(x - 17, y - 15, 8, '#997f70');
    circle(x + 17, y - 15, 8, '#997f70');
    circle(x, y, 25, '#80675c');
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#edf3f1';
    ctx.fillRect(x - 26, y + 8, 52, 22);
    ctx.fillStyle = r.color;
    ctx.fillRect(x - 26, y + 13, 52, 9);
    ctx.restore();
    circle(x - 22, y + 17, 7, '#b39a88');
    circle(x + 22, y + 17, 7, '#b39a88');
    ctx.fillStyle = '#26383e';
    ctx.fillRect(x - 23, y - 9, 46, 5);
    circle(x - 10, y - 6, 11, '#e8f6f3');
    circle(x + 10, y - 6, 11, '#e8f6f3');
    circle(x - 9, y - 6, 7, '#a5ddd9');
    circle(x + 11, y - 6, 7, '#a5ddd9');
    circle(x - 7, y - 5, 3, '#15262b');
    circle(x + 13, y - 5, 3, '#15262b');
    circle(x + 2, y + 5, 5, '#e5a4a0');
  }

  // All labels/objects are prepared on answers or resize, never in the frame loop.
  function draw() {
    if (destroyed || document.hidden) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#101f27';
    ctx.fillRect(0, 0, width, height);
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    if (mode === 'teams') {
      const barWidth = (width - 48) / 2;
      for (let i = 0; i < 2; i++) {
        const t = teams[i];
        const x = 16 + i * (barWidth + 16);
        ctx.fillStyle = TEAM_COLORS[t.team];
        ctx.fillText(t.label, x, 26, barWidth);
        ctx.fillStyle = '#31434c';
        ctx.fillRect(x, 38, barWidth, 10);
        ctx.fillStyle = TEAM_COLORS[t.team];
        ctx.fillRect(x, 38, barWidth * t.steps / (totalSteps * 2), 10);
      }
    } else {
      ctx.fillStyle = '#b9d1ce';
      ctx.fillText('THE MOLE CUP  /  EVERY CORRECT ANSWER COUNTS', 18, 30, width - 36);
    }
    const finishX = width - 44;
    ctx.fillStyle = '#b9d1ce';
    ctx.fillText('START', 18, 92);
    ctx.textAlign = 'right';
    ctx.fillText('FINISH', width - 16, 92);
    ctx.fillStyle = '#e6eeea';
    ctx.fillRect(finishX, 55, 2, 25);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillStyle = (row + col) % 2 ? '#203139' : '#eef5f0';
        ctx.fillRect(finishX + col * 6, 55 + row * 6, 6, 6);
      }
    }
    const laneHeight = (height - 116) / 4;
    for (let i = 0; i < 4; i++) {
      const y = 104 + i * laneHeight;
      const r = lanes[i];
      ctx.fillStyle = i % 2 ? '#20343c' : '#243b43';
      ctx.fillRect(12, y, width - 24, laneHeight - 6);
      ctx.fillStyle = '#476068';
      ctx.fillRect(38, y + laneHeight - 16, width - 76, 1);
      for (let row = 0; row < Math.ceil((laneHeight - 6) / 8); row++) {
        for (let col = 0; col < 2; col++) {
          ctx.fillStyle = (row + col) % 2 ? '#243b43' : '#9bb5b5';
          ctx.fillRect(finishX + col * 8, y + row * 8, 8, Math.min(8, laneHeight - 6 - row * 8));
        }
      }
      ctx.textAlign = 'left';
      if (!r) {
        ctx.fillStyle = '#9cb1b7';
        ctx.fillText('OPEN LANE', 24, y + 22);
        continue;
      }
      ctx.fillStyle = mode === 'teams' ? TEAM_COLORS[r.team] : r.color;
      ctx.fillRect(12, y, 4, laneHeight - 6);
      ctx.fillStyle = '#f1f7f3';
      ctx.fillText(r.label, 24, y + 21, Math.max(40, width - 124));
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c4d6d8';
      ctx.fillText(r.counter, width - 24, y + 21, 66);
      let x = 44 + (finishX - 44) * r.position / totalSteps;
      if (!quiet && r.shake > 0) x += Math.sin(r.shake * 0.075) * 3;
      mole(r, x, y + laneHeight * 0.62);
    }
  }

  function moving() {
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].position !== lanes[i].steps || lanes[i].shake > 0) return true;
    }
    return false;
  }

  function frame(now) {
    frameId = null;
    if (destroyed || document.hidden) return;
    const dt = Math.min(50, Math.max(0, now - lastTime));
    lastTime = now;
    const ease = 1 - Math.exp(-dt / 110);
    for (let i = 0; i < lanes.length; i++) {
      const r = lanes[i];
      r.position += (r.steps - r.position) * ease;
      if (Math.abs(r.steps - r.position) < 0.002) r.position = r.steps;
      r.shake = Math.max(0, r.shake - dt);
    }
    draw();
    if (moving()) frameId = requestAnimationFrame(frame);
  }

  function wake() {
    if (destroyed || document.hidden || frameId !== null || !moving()) return;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function visibility() {
    if (document.hidden) {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    } else {
      resize();
      wake();
    }
  }

  function resize() {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    draw();
  }

  function motionChange() {
    quiet = reducedMotion === undefined ? media.matches : Boolean(reducedMotion);
    if (quiet) {
      for (const r of lanes) { r.position = r.steps; r.shake = 0; }
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      draw();
    }
  }

  function correct(id) {
    const r = byId.get(id);
    if (!started || ended || destroyed || !r || r.steps >= totalSteps) return;
    r.steps++;
    r.counter = r.steps + ' / ' + totalSteps;
    if (quiet) r.position = r.steps;
    if (r.steps === totalSteps) r.finishOrder = ++finishedCount;
    if (mode === 'teams') {
      const t = teams[r.team === 'A' ? 0 : 1];
      t.steps++;
      t.label = 'TEAM ' + t.team + '   ' + t.steps + ' / ' + totalSteps * 2;
      if (t.steps === totalSteps * 2) { winningTeam = t.team; ended = true; }
    } else ended = finishedCount === lanes.length;
    announce();
    draw();
    wake();
    if (ended) onFinish(standings());
  }

  function wrong(id) {
    const r = byId.get(id);
    if (!started || ended || destroyed || !r || r.steps >= totalSteps) return;
    announce();
    summary.textContent = r.name + ': try again. No steps lost. ' + summary.textContent;
    if (!quiet) { r.shake = 280; wake(); }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', visibility);
  media.addEventListener('change', motionChange);
  // Reject absolute/protocol-relative and cross-origin sprites before any request.
  for (let i = 0; i < racers.length; i++) {
    const path = racers[i].sprite;
    if (typeof path !== 'string' || !path.trim() || /^[a-z][a-z\d+.-]*:|^[\/\\]/i.test(path.trim())) continue;
    let url;
    try { url = new URL(path, document.baseURI); } catch { continue; }
    if (url.origin !== window.location.origin) continue;
    const r = lanes[i];
    r.image = new Image();
    r.image.onload = () => {
      if (destroyed) return;
      r.spriteReady = r.image.naturalWidth > 0 && r.image.naturalHeight > 0;
      draw();
    };
    r.image.onerror = () => { r.spriteReady = false; draw(); };
    r.image.src = url.href;
  }
  resize();
  announce();
  return {
    start() { if (!destroyed && !ended) started = true; },
    correct, wrong, standings,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', motionChange);
      for (const r of lanes) {
        if (r.image) { r.image.onload = null; r.image.onerror = null; }
      }
      summary.remove();
    }
  };
}
