import './style.css';
import { assetUrl } from './assets';
import { Game, type Hud } from './game';

// Screens and controls around the night: the title, the bar along the top, the stick, and
// what's said when a night ends.

const BOTTLES = ['floral', 'citrus', 'amber', 'fresh', 'green', 'gourmand', 'spicy', 'woody'];
const ui = document.getElementById('ui')!;
const img = (name: string, cls = '') => `<img class="${cls}" src="${assetUrl(`custom/ui/${name}.png`)}" alt="" draggable="false" />`;

ui.innerHTML = `
  <div class="vignette" data-vignette></div>
  <div class="hud" data-hud hidden>
    <div class="hud-row">
      <span class="pill" data-night></span>
      <span class="bottles" data-bottles></span>
      <span class="pill">${img('coin', 'coin')}<b data-score>0</b></span>
    </div>
    <div class="meter"><div class="meter-fill" data-meter></div></div>
    <div class="hint" data-hint></div>
  </div>
  <button class="act" data-act hidden></button>
  <div class="stick" data-stick hidden><img src="${assetUrl('kenney/mobile-controls/joystick_circle_nub_a.png')}" alt="" draggable="false" /></div>
  <div class="screen" data-screen></div>`;

const $ = <T extends HTMLElement>(key: string) => ui.querySelector<T>(`[data-${key}]`)!;
const hudEl = $('hud');
const screen = $('screen');
const act = $<HTMLButtonElement>('act');
const stick = $('stick');
const knob = stick.querySelector('img')!;
stick.style.backgroundImage = `url("${assetUrl('kenney/mobile-controls/joystick_circle_pad_a.png')}")`;

interface Best {
  night: number;
  score: number;
}
function best(): Best {
  try {
    return JSON.parse(localStorage.getItem('hush.best') ?? '') as Best;
  } catch {
    return { night: 0, score: 0 };
  }
}
function keepBest(night: number, score: number): boolean {
  const b = best();
  if (score <= b.score) return false;
  localStorage.setItem('hush.best', JSON.stringify({ night: Math.max(night, b.night), score }));
  return true;
}

let last = '';
let shown: Hud | null = null;
let hintUntil = 0;

const game = new Game(document.getElementById('scene')!, {
  hud(h) {
    shown = h;
    const key = [h.night, h.got, h.total, h.quota, h.score, h.chased, h.canSit, h.sitting, h.hidden, h.unlocked].join();
    $('meter').style.transform = `scaleX(${h.meter.toFixed(3)})`;
    $('meter').classList.toggle('meter-fill--hot', h.meter > 0.6);
    if (key === last) return;
    last = key;
    $('night').textContent = `Night ${h.night}`;
    $('score').textContent = String(h.score);
    $('bottles').innerHTML = Array.from({ length: h.total }, (_, i) => img(i < h.got ? `bottle-${BOTTLES[i % BOTTLES.length]}` : 'bottle-unknown', `bottle${i < h.got ? ' bottle--got' : ''}${i === h.quota - 1 ? ' bottle--mark' : ''}`)).join('');
    $('vignette').classList.toggle('vignette--on', h.chased);
    act.hidden = !h.canSit;
    act.textContent = h.sitting ? 'Stand up' : 'Sit down';
    const hint = h.chased
      ? 'Spotted! Run, and break their line of sight.'
      : h.sitting
        ? h.hidden
          ? 'Just someone having a sit. Nothing to see.'
          : 'They watched you sit down…'
        : h.unlocked
          ? h.got === h.total
            ? 'That’s all of them. Out through the door!'
            : 'The door is open. Leave now, or take the rest.'
          : performance.now() < hintUntil
            ? 'Take the bottles. Stay out of the light. Running is loud.'
            : `${h.quota - h.got} more to open the door.`;
    $('hint').textContent = hint;
  },
  cleared(r) {
    const record = keepBest(r.night, r.score);
    show(`
      <h2>Night ${r.night} done</h2>
      <div class="stars">${[1, 2, 3].map((n) => img(n <= r.stars ? 'star' : 'star-empty', 'star')).join('')}</div>
      <ul>
        <li>${r.got} of ${r.total} bottles${r.got === r.total ? ' <b>· clean sweep</b>' : ''}</li>
        <li>${r.unseen ? '<b>Never chased</b>' : 'Chased, but out'}</li>
        <li>${img('coin', 'coin')} +${r.gained} <span class="dim">(${r.score} in all${record ? ', a new best' : ''})</span></li>
      </ul>
      <button data-go="next">Night ${r.night + 1}</button>`);
    next = { night: r.night + 1, score: r.score };
  },
  caught(r) {
    const record = keepBest(r.night - 1, r.score);
    show(`
      <h2>Caught!</h2>
      <p>“And where do you think you’re going with those?”</p>
      <ul>
        <li>Night ${r.night}, ${r.got} of ${r.total} bottles</li>
        <li>${img('coin', 'coin')} ${r.score}${record ? ' <b>· a new best</b>' : ` <span class="dim">(best ${best().score})</span>`}</li>
      </ul>
      <button data-go="again">Try again</button>`);
    next = { night: 1, score: 0 };
  },
});

let next = { night: 1, score: 0 };
const seed = () => (Math.random() * 2 ** 31) | 0;

function show(html: string): void {
  hudEl.hidden = act.hidden = true;
  shown = null;
  game.setStick(0, 0);
  $('vignette').classList.remove('vignette--on');
  screen.innerHTML = `<div class="card">${html}</div>`;
  screen.hidden = false;
}

async function begin(): Promise<void> {
  screen.innerHTML = '<div class="card card--small">…</div>';
  await game.start(next.night, seed(), true, next.score);
  last = '';
  hintUntil = performance.now() + (next.night === 1 ? 9000 : 0);
  screen.hidden = true;
  hudEl.hidden = false;
}

function title(): void {
  const b = best();
  show(`
    <h1>Hush</h1>
    <p class="tag">a tiny midnight heist</p>
    <p>The shop is shut. The bottles are not yours.<br />The watchmen have lamps.</p>
    <p class="dim">Drag anywhere to move: gently to creep, far to run (loud).<br />Keys: WASD, Shift to creep, Space to sit.</p>
    ${b.score ? `<p class="dim">Best: ${img('coin', 'coin')} ${b.score}</p>` : ''}
    <button data-go="play">Break in</button>`);
}

screen.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('[data-go]')) void begin();
});
act.addEventListener('click', () => game.toggleSit());

// The stick appears wherever a finger lands.
let finger: { id: number; x: number; y: number } | null = null;
const REACH = 56;
const sceneEl = document.getElementById('scene')!;
sceneEl.addEventListener('pointerdown', (e) => {
  if (finger || !shown) return;
  finger = { id: e.pointerId, x: e.clientX, y: e.clientY };
  sceneEl.setPointerCapture(e.pointerId);
  stick.hidden = false;
  stick.style.left = `${e.clientX}px`;
  stick.style.top = `${e.clientY}px`;
  knob.style.transform = '';
});
sceneEl.addEventListener('pointermove', (e) => {
  if (!finger || e.pointerId !== finger.id) return;
  let dx = (e.clientX - finger.x) / REACH;
  let dy = (e.clientY - finger.y) / REACH;
  const m = Math.hypot(dx, dy);
  if (m > 1) [dx, dy] = [dx / m, dy / m];
  knob.style.transform = `translate(${dx * REACH}px, ${dy * REACH}px)`;
  game.setStick(dx, -dy);
});
const release = (e: PointerEvent) => {
  if (!finger || e.pointerId !== finger.id) return;
  finger = null;
  stick.hidden = true;
  game.setStick(0, 0);
};
sceneEl.addEventListener('pointerup', release);
sceneEl.addEventListener('pointercancel', release);
document.addEventListener('contextmenu', (e) => e.preventDefault());

(window as unknown as { hush: Game }).hush = game;
title();
void game.start(2, seed(), false);
