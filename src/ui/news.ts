import { MONTH_NAMES, dateAt } from '../game/clock';
import { HOURS_PER_WEEK, events, weekOf } from '../game/events';
import { sourcing } from '../game/sourcing';
import { newsFor } from '../game/world';
import { nowGame, state } from '../state';
import { esc } from './html';
import { awards, entriesOpen, judgesWords, themeOf, yearAt } from '../game/awards';
import { entriesOf } from '../game/blend';
import { checkPerfume, sellable } from '../game/checks';
import { currentRank } from '../state';

// The newspaper: this week's events, and last week's.

function issue(week: number, title: string): string {
  const items = state.save.news![week];
  if (!items) return '';
  const date = dateAt(week * HOURS_PER_WEEK, sourcing.calendarStart);
  const stories = items.map((n) => `<article class="story"><h3>${esc(n.headline)}</h3><p>${esc(n.body)}</p></article>`).join('');
  return `<section class="issue"><p class="muted small">${title} · week of ${date.day} ${MONTH_NAMES[date.month - 1]}</p>${stories || '<p class="muted">A quiet week.</p>'}</section>`;
}

export function newsScreen(): string {
  const week = weekOf(nowGame());
  newsFor(state.save, nowGame());
  return `<header class="bar-top">
      <button class="link" data-action="close-panel">Close</button>
      <h1>${esc(events.paper)}</h1>
      <span></span>
    </header>
    <main class="news">
      ${awardsSection()}
      ${issue(week, 'This week')}
      ${issue(week - 1, 'Last week')}
      <p class="muted small">Events last for the week they're printed: bumper crops yield more for contracts signed that week, storms slow shipping, and prices swing at the supplier.</p>
    </main>`;
}

export function hasUnreadNews(): boolean {
  return weekOf(nowGame()) > (state.save.newsSeenWeek ?? -1);
}

/** The yearly awards: this year's theme, your entry, and past verdicts. */
function awardsSection(): string {
  const now = nowGame();
  const year = yearAt(now, sourcing.calendarStart);
  const a = state.save.awards!;
  const open = entriesOpen(now, sourcing.calendarStart);
  const entry = a.entries[year];
  let body: string;
  if (entry) body = `<p class="small">Your entry: <strong>“${esc(entry.name)}”</strong>. The judges announce the results when the year turns.${open ? ' You can still change it.' : ''}</p>`;
  else if (!open) body = `<p class="muted small">Entries open in the last ${awards.openDays} days of December. Save the perfume you want to enter in your formula book.</p>`;
  else body = '';
  const choices = open
    ? state.save.formulas
        .filter((f) => sellable(checkPerfume(entriesOf(f, state.save.bases), currentRank().wearableParts)))
        .map((f) => `<button class="chip" data-action="enter-awards" data-id="${esc(f.id)}">Enter “${esc(f.name)}”</button>`)
        .join('')
    : '';
  const past = Object.entries(a.results)
    .sort((x, y) => Number(y[0]) - Number(x[0]))
    .map(([y, r]) => `<li class="card"><div><strong>Year ${y}: ${esc(r.prize.name)}</strong> for “${esc(r.name)}”</div><ul class="plain small">${judgesWords(r).map((w) => `<li>“${esc(w)}”</li>`).join('')}</ul></li>`)
    .join('');
  return `<section class="issue awards">
    <h2>${esc(awards.name)}</h2>
    <p class="small">This year's theme: <strong>${esc(themeOf(year))}</strong>. Any perfume may enter; the judges look at its structure, balance, originality and cost.</p>
    ${body}
    ${open ? `<p class="small"><strong>Entries are open.</strong></p><div class="chips">${choices || '<span class="muted small">Save a perfume (within the safety limits) to enter it.</span>'}</div>` : ''}
    ${past ? `<ul class="list cards">${past}</ul>` : ''}
  </section>`;
}
