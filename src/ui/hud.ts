import { MONTH_NAMES, dateAt } from '../game/clock';
import { sourcing } from '../game/sourcing';
import { nowGame, state } from '../state';
import { esc } from './html';

/** Buttons and messages floating over the 3D shop. */
export function hud(): string {
  const { toast } = state.ui;
  const c = state.save.customers;
  const away = c ? c.visits.filter((v) => v.status === 'away').length : 0;
  const date = dateAt(nowGame(), sourcing.calendarStart);
  const crates = state.save.sourcing?.crates.length ?? 0;
  return `<div class="hud-top">
      <span class="hud-title">Field &amp; Flacon</span>
      <span class="chips"><button class="chip" data-action="nav" data-to="creator">Character</button><button class="chip" data-action="nav" data-to="book">Book</button></span>
    </div>
    <p class="hud-stats">${date.day} ${MONTH_NAMES[date.month - 1]} · <strong>${c?.money ?? 0}</strong> coins · reputation <strong>${c?.reputation ?? 0}</strong>${crates ? ` · ${crates} crate${crates === 1 ? '' : 's'} to unpack` : ''}${away ? ` · ${away} out being worn` : ''}</p>
    <p class="hud-hint">Tap a customer to chat · tap the organ to compose</p>
    ${toast ? `<div class="toast" role="status"><span>${esc(toast)}</span><button class="link" data-action="dismiss-toast">OK</button></div>` : ''}`;
}
