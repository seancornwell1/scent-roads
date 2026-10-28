import { chapterInfo, routeById } from '../game/routes';
import { sourcing } from '../game/sourcing';
import { state } from '../state';
import { esc } from './html';

// A new season is a new chapter: who has written, and a way to the letters.

export function chapterScreen(): string {
  const index = state.save.routes!.chapter;
  const c = chapterInfo(index, sourcing.calendarStart);
  const from = c.letters.map((id) => routeById(id)?.from).filter(Boolean) as string[];
  return `<header class="bar-top"><button class="link" data-action="close-panel">Later</button><h1>Chapter ${index + 1}</h1><span></span></header>
    <main class="customer intro">
      <h2>${esc(c.title)}</h2>
      <p class="muted small">${esc(c.season)}, year ${Math.floor(index / 4) + 1}</p>
      ${c.text ? `<p>${esc(c.text)}</p>` : ''}
      ${from.length ? `<p class="small">Letters from <strong>${esc(from.join(', '))}</strong> are waiting in the back room.</p>` : ''}
      <div class="row-between"><span></span>${from.length ? '<button class="primary" data-action="read-letters">Read the letters</button>' : '<button class="primary" data-action="close-panel">Back to the shop</button>'}</div>
    </main>`;
}
