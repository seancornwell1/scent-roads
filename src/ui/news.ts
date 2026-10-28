import { MONTH_NAMES, dateAt } from '../game/clock';
import { HOURS_PER_WEEK, events, weekOf } from '../game/events';
import { sourcing } from '../game/sourcing';
import { newsFor } from '../game/world';
import { nowGame, state } from '../state';
import { esc } from './html';

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
      ${issue(week, 'This week')}
      ${issue(week - 1, 'Last week')}
      <p class="muted small">Events last for the week they're printed: bumper crops yield more for contracts signed that week, storms slow shipping, and prices swing at the supplier.</p>
    </main>`;
}

export function hasUnreadNews(): boolean {
  return weekOf(nowGame()) > (state.save.newsSeenWeek ?? -1);
}
