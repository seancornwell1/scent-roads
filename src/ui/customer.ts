import { bandText, clients, fillTemplate, findBrief, type Regular } from '../game/clients';
import { content, materialsById } from '../game/content';
import type { CustomerState, Visit } from '../game/customers';
import { drydown } from '../game/evaporation';
import { gameHoursToMs } from '../game/time';
import type { Tier } from '../game/unlocks';
import { unlocks } from '../game/unlocks';
import { drydownGraph } from './graph';
import { esc } from './html';

// Panels for customers: their brief, their first reaction, and their review.

const STAR = '★';
const NO_STAR = '☆';

function stars(n: number): string {
  return STAR.repeat(n) + NO_STAR.repeat(5 - n);
}

function panelHeader(title: string): string {
  return `<header class="bar-top">
    <button class="link" data-action="close-panel">Close</button>
    <h1>${esc(title)}</h1>
    <span></span>
  </header>`;
}

export function regularOf(visit: Visit): Regular | undefined {
  return visit.regularId ? clients.regulars.find((r) => r.id === visit.regularId) : undefined;
}

/** What a regular says about the last perfume you made them, if any. */
function rememberLine(regular: Regular, state: CustomerState): string {
  const last = state.regulars[regular.id]?.history.at(-1);
  if (!last) return '';
  const line = regular.remember.find((r) => last.stars >= r.minStars) ?? regular.remember[regular.remember.length - 1];
  const stage = last.weakStage ? clients.lines.stageNames[last.weakStage] : 'one part';
  return fillTemplate(line.text, { perfume: `“${last.perfume}”`, stage });
}

export function customerScreen(visit: Visit, state: CustomerState): string {
  return visit.status === 'returning' ? reviewScreen(visit) : briefScreen(visit, state);
}

function briefScreen(visit: Visit, state: CustomerState): string {
  const brief = findBrief(visit.briefId)!;
  const regular = regularOf(visit);
  const intro = regular
    ? `<p class="muted small">${esc(regular.about)}</p><p>${esc(regular.greeting)} ${esc(rememberLine(regular, state))}</p>`
    : `<p class="muted small">A new customer.</p>`;
  const hints = brief.hints
    .slice(0, visit.hintsAsked)
    .map((h) => `<p class="hint">“${esc(h)}”</p>`)
    .join('');
  const canAsk = visit.hintsAsked < brief.hints.length;
  const chatter = !canAsk && visit.hintsAsked > 0 ? `<p class="muted small">${esc(clients.lines.chatter[visit.hintsAsked % clients.lines.chatter.length])}</p>` : '';
  return `${panelHeader(visit.name + (regular ? ' · regular' : ''))}
    <main class="customer">
      ${intro}
      <p class="muted small">They'd like a perfume of a memory:</p>
      <blockquote class="memory">“${esc(brief.memory)}”</blockquote>
      ${hints}${chatter}
      <div class="row-between">
        ${canAsk ? `<button class="link" data-action="ask-hint">Ask about it</button>` : '<span></span>'}
        <button class="primary" data-action="compose-for">Compose for ${esc(visit.name)}</button>
      </div>
    </main>`;
}

function reviewScreen(visit: Visit): string {
  const result = visit.result!;
  const lines = clients.lines;
  const stageLines = result.stages
    .map((s) => `<li><strong>${esc(cap(lines.stageNames[s.stage] ?? s.stage))}:</strong> ${esc(bandText(lines.stageWords, s.score))}</li>`)
    .join('');
  const remarks: string[] = [];
  remarks.push(result.weakStage ? fillTemplate(lines.letDown, { stage: lines.stageNames[result.weakStage] ?? result.weakStage }) : lines.allGood);
  const brief = findBrief(visit.briefId)!;
  if (result.longevityScore < 0.6) remarks.push(lines.tooWeak);
  if (result.strengthScore < 0.6) {
    const words = clients.scoring.strengthWords;
    remarks.push(fillTemplate(lines.strengthOff, { actual: words[result.strength - 1], target: words[brief.target.strength - 1] }));
  }
  if (result.mood < 0.5) remarks.push(fillTemplate(lines.moodOff, { moods: brief.target.moods.join(' and ') }));
  const change = clients.economy.reputationForStars[result.stars - 1];
  const parts = visit.perfume!.parts;
  return `${panelHeader(`${visit.name} is back`)}
    <main class="customer">
      <p class="muted small">How “${esc(visit.perfume!.name)}” wore, for “${esc(brief.memory)}”</p>
      <p class="stars" aria-label="${result.stars} of 5 stars">${stars(result.stars)}</p>
      <ul class="plain review">${stageLines}</ul>
      ${remarks.map((r) => `<p>“${esc(r)}”</p>`).join('')}
      <h2>Their perfume's drydown</h2>
      ${drydownGraph(drydown(parts, materialsById, content.model))}
      <div class="row-between">
        <span class="muted small">Reputation ${change >= 0 ? '+' : ''}${change}</span>
        <button class="primary" data-action="complete-review">Thank ${esc(visit.name)}</button>
      </div>
    </main>`;
}

export function reactionScreen(visit: Visit): string {
  const result = visit.result!;
  const minutes = Math.round(gameHoursToMs(clients.timing.reviewAfterGameHours) / 60_000);
  return `${panelHeader(visit.name)}
    <main class="customer">
      <p class="muted small">They try “${esc(visit.perfume!.name)}” on their wrist…</p>
      <blockquote class="memory">“${esc(bandText(clients.lines.impression, result.impression))}”</blockquote>
      <p>They pay <strong>${visit.perfume!.paid} coins</strong>.</p>
      <p class="muted small">They'll come back to tell you how it wore through the day, in about ${minutes} minutes.</p>
      <div class="row-between"><span></span><button class="primary" data-action="close-panel">Goodbye!</button></div>
    </main>`;
}

export function unlockScreen(tier: Tier): string {
  const rows = tier.materials
    .map((id) => {
      const m = materialsById.get(id)!;
      const source = m.type === 'natural' ? `Grown${m.origin.region ? ` · ${m.origin.region}` : ''}` : 'Catalogue';
      return `<li><strong>${esc(m.name)}</strong> <span class="muted small">${esc(source)}</span><br><span class="small">${esc(m.character)}</span></li>`;
    })
    .join('');
  return `${panelHeader('New materials')}
    <main class="customer">
      <h2>${esc(tier.name)}</h2>
      <p>${esc(tier.teaches)}</p>
      <ul class="plain unlock-list">${rows}</ul>
      <p class="muted small">${esc(unlocks.sources.natural.how)} ${esc(unlocks.sources.synthetic.how)} Until then, you have a sample of each.</p>
      <div class="row-between"><span></span><button class="primary" data-action="close-panel">Lovely</button></div>
    </main>`;
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
