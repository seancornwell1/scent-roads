import { bandText, clients, fillTemplate, findBrief, type Regular } from '../game/clients';
import type { CharacterConfig } from '../game/character';
import { content, materialsById } from '../game/content';
import { bonusFor, type CustomerState, type Visit } from '../game/customers';
import { drydown } from '../game/evaporation';
import { feedbackLines } from '../game/feedback';
import { gameHoursToMs } from '../game/time';
import type { Tier } from '../game/unlocks';
import { unlocks } from '../game/unlocks';
import { pageById, personById, requestById, type StoryState } from '../game/story';
import { drydownGraph } from './graph';
import { effective, entriesOf } from '../game/blend';
import { esc, starsText } from './html';
import { pageCard } from './book';

// Panels for customers: their brief, their first reaction, and their review.

const MAX_STARS = 3;

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

/** The fixed look of a regular or a townsperson, if they have one. */
export function lookOf(visit: Visit): CharacterConfig | undefined {
  if (visit.storyId) return personById(requestById(visit.storyId)?.person ?? '')?.look;
  return regularOf(visit)?.look;
}

/** What a regular says about the last perfume you made them, if any. */
function rememberLine(regular: Regular, state: CustomerState): string {
  const last = state.regulars[regular.id]?.history.at(-1);
  if (!last) return '';
  const line = regular.remember.find((r) => last.stars >= r.minStars) ?? regular.remember[regular.remember.length - 1];
  const stage = last.weakStage ? clients.lines.stageNames[last.weakStage] : 'one part';
  return fillTemplate(line.text, { perfume: `“${last.perfume}”`, stage });
}

export function customerScreen(visit: Visit, state: CustomerState, story: StoryState): string {
  return visit.status === 'returning' ? reviewScreen(visit) : briefScreen(visit, state, story);
}

/** A townsperson's greeting, what they brought, and (when they come back) what they said last time. */
function storyIntro(visit: Visit, story: StoryState): string {
  const r = requestById(visit.storyId!)!;
  const person = personById(r.person)!;
  const rs = story.requests[r.id];
  const again = (rs?.attempts ?? 0) > 0;
  let out = `<p class="muted small">${esc(person.about)}</p><p>${esc(again && r.retryGreeting ? r.retryGreeting : r.greeting)}</p>`;
  if (r.gives && rs?.gave && !again) {
    const names = r.gives.map((g) => `${g.grams} g of ${materialsById.get(g.material)?.name ?? g.material}`).join(', ');
    out += `<p>“${esc(r.giveText ?? '')}”</p><p class="banner small"><span>New material: <strong>${esc(names)}</strong>, now on your organ.</span></p>`;
  }
  if (again && rs?.last) {
    const lines = feedbackLines(rs.last, 3).map((l) => `<p class="hint">“${esc(l)}”</p>`).join('');
    out += `<p class="muted small">${esc(clients.lines.feedback.lastTime)}</p>${lines}`;
  }
  return out;
}

function briefScreen(visit: Visit, state: CustomerState, story: StoryState): string {
  const brief = findBrief(visit.briefId)!;
  const regular = regularOf(visit);
  const intro = visit.storyId
    ? storyIntro(visit, story)
    : regular
      ? `<p class="muted small">${esc(regular.about)}</p><p>${esc(regular.greeting)} ${esc(rememberLine(regular, state))}</p>`
      : `<p class="muted small">A new customer.</p>`;
  const hints = brief.hints
    .slice(0, visit.hintsAsked)
    .map((h) => `<p class="hint">“${esc(h)}”</p>`)
    .join('');
  const canAsk = visit.hintsAsked < brief.hints.length;
  const chatter = !canAsk && visit.hintsAsked > 0 && !visit.storyId ? `<p class="muted small">${esc(clients.lines.chatter[visit.hintsAsked % clients.lines.chatter.length])}</p>` : '';
  const page = brief.page ? pageById(brief.page) : undefined;
  const pageBlock = page ? `<h2>Her page</h2><p class="muted small">It's in her book, but the ink has run.</p>${pageCard(page, story, false)}` : '';
  const title = visit.name + (regular ? ' · regular' : '');
  return `${panelHeader(title)}
    <main class="customer">
      ${intro}
      <p class="muted small">${page ? 'They remember it like this:' : "They'd like a perfume of a memory:"}</p>
      <blockquote class="memory">“${esc(brief.memory)}”</blockquote>
      ${brief.budget !== undefined ? `<p class="small">They can spend up to <strong>€${brief.budget}</strong> per 100 g of concentrate on materials.</p>` : ''}
      ${hints}${chatter}
      ${pageBlock}
      <div class="row-between">
        ${canAsk ? `<button class="link" data-action="ask-hint">Ask about it</button>` : '<span></span>'}
        <button class="primary" data-action="compose-for">Compose for ${esc(visit.name)}</button>
      </div>
    </main>`;
}

function reviewScreen(visit: Visit): string {
  const result = visit.result!;
  const lines = clients.lines;
  const brief = findBrief(visit.briefId)!;
  const stageLines = result.stages
    .map((s) => `<li><strong>${esc(cap(lines.stageNames[s.stage] ?? s.stage))}:</strong> ${esc(bandText(lines.stageWords, s.score))}</li>`)
    .join('');
  const remarks = feedbackLines(result, 2);
  const r = visit.storyId ? requestById(visit.storyId) : undefined;
  const page = brief.page ? pageById(brief.page) : undefined;
  let outcome = '';
  if (r && result.stars === 3) outcome = `<p>“${esc(r.thanks)}”</p>`;
  if (page && result.stars === 3) outcome += `<p class="banner small"><span>You've recovered a page of her book: <strong>${esc(page.title)}</strong>.</span></p>`;
  else if (page) outcome += `<p class="muted small">Not quite her formula yet. ${esc(visit.name)} will come back to try again, and tell you more.</p>`;
  const change = clients.economy.reputationForStars[result.stars - 1];
  const bonus = bonusFor(visit);
  const parts = visit.perfume!.parts;
  return `${panelHeader(`${visit.name} is back`)}
    <main class="customer">
      <p class="muted small">How “${esc(visit.perfume!.name)}” wore, for “${esc(brief.memory)}”</p>
      <p class="stars" aria-label="${result.stars} of ${MAX_STARS} stars">${starsText(result.stars)}</p>
      <ul class="plain review">${stageLines}</ul>
      ${remarks.map((x) => `<p>“${esc(x)}”</p>`).join('')}
      ${outcome}
      <h2>Their perfume's drydown</h2>
      ${drydownGraph(drydown(effective(visit.perfume!.entries ?? entriesOf({ parts })), materialsById, content.model))}
      <div class="row-between">
        <span class="muted small">Reputation ${change >= 0 ? '+' : ''}${change}${bonus ? ` · bonus ${bonus} coins` : ''}</span>
        <button class="primary" data-action="complete-review">Thank ${esc(visit.name)}</button>
      </div>
    </main>`;
}

export function reactionScreen(visit: Visit): string {
  const result = visit.result!;
  const minutes = Math.max(1, Math.round(gameHoursToMs(clients.timing.reviewAfterGameHours) / 60_000));
  const first = feedbackLines(result, 1)
    .map((l) => `<p>“${esc(l)}”</p>`)
    .join('');
  return `${panelHeader(visit.name)}
    <main class="customer">
      <p class="muted small">They try “${esc(visit.perfume!.name)}” on their wrist…</p>
      <blockquote class="memory">“${esc(bandText(clients.lines.impression, result.impression))}”</blockquote>
      ${first}
      <p>They pay <strong>${visit.perfume!.paid} coins</strong>.</p>
      <p class="muted small">They'll come back to tell you how it wore through the day, in about ${minutes < 90 ? `${minutes} minutes` : `${Math.round(minutes / 60)} hours`}. Three stars earns a bonus.</p>
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
      <p class="muted small">${esc(unlocks.sources.natural.how)} ${esc(unlocks.sources.synthetic.how)} The supplier in the back room sells all of them.</p>
      <div class="row-between"><span></span><button class="primary" data-action="close-panel">Lovely</button></div>
    </main>`;
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
