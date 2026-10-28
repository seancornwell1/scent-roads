import { feedbackLines } from '../game/feedback';
import { briefUnlocked, cluesFound, epilogueText, jarHoursLeft, jarReady, signature, type CluePath } from '../game/signature';
import { familiesById } from '../game/content';
import { shopStyle } from '../game/style';
import { story } from '../game/story';
import { clueContext } from '../game/world';
import { currentRank, nowGame, state } from '../state';
import { timeLeft } from './backroom';
import { esc, header, starsText } from './html';

// Her last page: the clues you've found, her labdanum jar, and the final brief.

const PATHS: { id: CluePath; name: string }[] = [
  { id: 'town', name: 'The town' },
  { id: 'routes', name: 'Her growers' },
  { id: 'craft', name: 'The craft' },
];

export function signatureScreen(): string {
  const sig = state.save.signature!;
  const now = nowGame();
  const found = cluesFound(clueContext(state.save));
  const foundIds = new Set(found.map((c) => c.id));
  const clueLists = PATHS.map((p) => {
    const items = signature.clues
      .filter((c) => c.path === p.id)
      .map((c) => (foundIds.has(c.id) ? `<li><strong>${esc(c.from)}:</strong> “${esc(c.text)}”</li>` : '<li class="muted">Not found yet.</li>'))
      .join('');
    return `<h3>${p.name}</h3><ul class="plain small clue-list">${items}</ul>`;
  }).join('');

  const left = jarHoursLeft(sig, now);
  const jar =
    left === null
      ? `<p class="small">${esc(signature.jar.about)}</p><button class="primary" data-action="start-jar">Start the jar (${signature.jar.grams} g of neat labdanum)</button>`
      : left > 0
        ? `<p class="small">Ageing since you started it. Ready in ${timeLeft(now + left)}.</p>`
        : '<p class="small"><strong>Ready.</strong> Deep, soft and old, the way she kept it.</p>';

  const unlocked = briefUnlocked(found);
  let final: string;
  if (sig.completedAt) {
    final = `<p>You've recreated her perfume. Her last page is whole.</p><button class="primary" data-action="nav" data-to="epilogue">Read the epilogue</button>`;
  } else if (!unlocked) {
    final = `<p class="muted small">Find ${signature.needed} clues, from any of the three paths, and her last page will make sense. You have ${found.length}.</p>`;
  } else {
    const b = signature.brief;
    const last = sig.result
      ? `<p class="stars" aria-label="${sig.result.stars} of 3 stars">${starsText(sig.result.stars)}</p>${feedbackLines(sig.result, 3).map((l) => `<p class="hint">“${esc(l)}”</p>`).join('')}<p class="muted small">Close, but not hers yet. Try again.</p>`
      : '';
    final = `<blockquote class="memory">“${esc(b.memory)}”</blockquote>
      ${b.hints.map((h) => `<p class="hint">“${esc(h)}”</p>`).join('')}
      ${last}
      ${jarReady(sig, now) ? '<button class="primary" data-action="signature-compose">Compose it at the organ</button>' : '<p class="muted small">It needs her labdanum, aged in the jar. Wait for it to be ready.</p>'}`;
  }

  return `${header(signature.title)}
    <main class="customer">
      <p class="muted small">The last page of her book. ${found.length} of ${signature.clues.length} clues found.</p>
      ${clueLists}
      <h2>${esc(signature.jar.name)}</h2>
      ${jar}
      <h2>Her perfume</h2>
      ${final}
    </main>`;
}

export function epilogueScreen(): string {
  const found = cluesFound(clueContext(state.save));
  const style = Object.entries(shopStyle(state.save.styleHistory ?? [])).sort((a, b) => b[1] - a[1])[0];
  const text = epilogueText(found, {
    pages: Object.keys(state.save.story!.pages).filter((id) => story.pages.some((p) => p.id === id && !p.signature)).length,
    style: style ? (familiesById.get(style[0])?.name.toLowerCase() ?? null) : null,
    rank: currentRank().name,
  });
  return `${header(signature.epilogue.title)}
    <main class="customer intro">
      ${text.map((p) => `<p>${esc(p)}</p>`).join('')}
      <div class="row-between"><span></span><button class="primary" data-action="close-panel">Back to the shop</button></div>
    </main>`;
}
