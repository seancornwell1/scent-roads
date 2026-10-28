import { content } from '../game/content';
import { examBlockers, nextRank } from '../game/ranks';
import { ownedMaterials } from '../game/world';
import { currentRank, state } from '../state';
import { esc } from './html';

// More: your character, sound, notifications, and saving and loading.

const SOUND_LEVELS = [
  { label: 'Off', value: 0 },
  { label: 'Quiet', value: 0.4 },
  { label: 'Normal', value: 0.8 },
];

export function optionsScreen(message: string | null): string {
  const volume = state.save.sound ?? 0.8;
  const notifySupported = 'Notification' in window && 'serviceWorker' in navigator;
  const permission = notifySupported ? Notification.permission : 'unsupported';
  const notifyLine = !notifySupported
    ? "This browser can't show notifications. On iPhone, add the game to your Home Screen first (iOS 16.4 or later)."
    : permission === 'denied'
      ? "Notifications are blocked for this app in your phone's settings."
      : state.save.notify
        ? "On: you'll get a notification when a harvest ripens, a crate arrives or a customer comes back with a review, while the game is open in the background."
        : 'Off.';
  return `<header class="bar-top">
      <button class="link" data-action="close-panel">Close</button>
      <h1>More</h1>
      <span></span>
    </header>
    <main class="customer">
      <button class="big-button" data-action="nav" data-to="creator">Change your character</button>

      ${rankSection()}

      <h2>Sound</h2>
      <div class="chips">${SOUND_LEVELS.map((l) => `<button class="chip ${volume === l.value ? 'on' : ''}" data-action="sound-volume" data-value="${l.value}">${l.label}</button>`).join('')}</div>

      <h2>Notifications</h2>
      <p class="small">${esc(notifyLine)}</p>
      ${notifySupported && permission !== 'denied' ? `<button class="primary" data-action="toggle-notify">${state.save.notify ? 'Turn off' : 'Turn on'}</button>` : ''}
      <p class="muted small">Web apps on iPhone can't wake up on their own: alerts while the game is fully closed would need a push server, which this game doesn't have.</p>

      <h2>Save</h2>
      <p class="small">Your game is saved on this phone. Export a copy to keep it safe or move it to another device.</p>
      <div class="row-between">
        <button class="primary" data-action="export-save">Export save file</button>
        <button class="link" data-action="copy-save">Copy as text</button>
      </div>
      <p class="small">Import replaces this game with the one you load.</p>
      <label class="file-pick">Import a save file <input type="file" id="import-file" accept=".json,application/json" data-action-change="import-file" /></label>
      <textarea id="import-text" rows="3" placeholder="…or paste save text here"></textarea>
      <button class="link" data-action="import-text">Import pasted text</button>
      ${message ? `<p class="small warn-text">${esc(message)}</p>` : ''}
    </main>`;
}

/** Your rank, and what it takes to sit the next exam. */
function rankSection(): string {
  const rank = currentRank();
  const next = nextRank(rank.id);
  const parts = `Formulas of ${rank.wearableParts.join(' or ')} parts${rank.dilutions ? ', dilutions' : ''}${rank.bases ? ', saved bases' : ''}${rank.budgets ? ', budget briefs' : ''}.`;
  let exam = '<p class="small">You are a master. There is no higher rank.</p>';
  if (next) {
    const owned = content.materials.filter((m) => ownedMaterials(state.save).has(m.id));
    const blockers = examBlockers(next, state.save.customers!.reputation, state.save.learning!, owned);
    const inProgress = state.save.exam?.rank === next.id;
    exam = `<p class="small"><strong>Next: ${esc(next.name)}.</strong> ${esc(next.about)}</p>
      <p class="muted small">The exam: name ${next.exam!.identify.pass} of ${next.exam!.identify.questions} materials from their descriptions alone, then build a classic accord to three stars.</p>
      ${blockers.length ? `<ul class="plain small">${blockers.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : `<button class="primary" data-action="${inProgress ? 'nav' : 'start-exam'}" data-to="exam">${inProgress ? 'Continue the exam' : 'Sit the exam'}</button>`}`;
  }
  return `<h2>Your rank: ${esc(rank.name)}</h2>
    <p class="small">${esc(parts)}</p>
    ${exam}`;
}
