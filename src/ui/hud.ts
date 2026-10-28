import { MONTH_NAMES, dateAt, seasonOf } from '../game/clock';
import { weekOf } from '../game/events';
import { sourcing } from '../game/sourcing';
import { shopAppeal } from '../game/world';
import { nowGame, state } from '../state';
import { hasUnreadNews } from './news';
import { esc } from './html';

/** Buttons and messages floating over the 3D shop. */
export function hud(): string {
  const { toast } = state.ui;
  const c = state.save.customers;
  const away = c ? c.visits.filter((v) => v.status === 'away').length : 0;
  const date = dateAt(nowGame(), sourcing.calendarStart);
  const crates = state.save.sourcing?.crates.length ?? 0;
  const unread = hasUnreadNews();
  const { appeal, level } = shopAppeal(state.save);
  return `<div class="hud-top">
      <span class="chips">
        <button class="chip" data-action="nav" data-to="upgrades">Shop</button>
        <button class="chip" data-action="nav" data-to="news">News${unread ? ' <span class="dot" aria-label="new">•</span>' : ''}</button>
        <button class="chip" data-action="nav" data-to="book">Book</button>
        <button class="chip" data-action="nav" data-to="options">More</button>
      </span>
    </div>
    <p class="hud-stats">${date.day} ${MONTH_NAMES[date.month - 1]} · ${seasonOf(date.month)}, week ${weekOf(nowGame()) + 1} · <strong>${c?.money ?? 0}</strong> coins · reputation <strong>${c?.reputation ?? 0}</strong> · ${esc(level.name)} (${appeal})${crates ? ` · ${crates} crate${crates === 1 ? '' : 's'} to unpack` : ''}${away ? ` · ${away} out being worn` : ''}</p>
    <p class="hud-hint">Tap a customer to chat · tap the organ to compose</p>
    ${toast ? `<div class="toast" role="status"><span>${esc(toast)}</span><button class="link" data-action="dismiss-toast">OK</button></div>` : ''}`;
}
