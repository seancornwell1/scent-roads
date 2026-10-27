import { state } from '../state';
import { esc } from './html';

/** Buttons and messages floating over the 3D shop. */
export function hud(): string {
  const { toast } = state.ui;
  return `<div class="hud-top">
      <span class="hud-title">Field &amp; Flacon</span>
      <button class="chip" data-action="nav" data-to="book">Formula book</button>
    </div>
    <p class="hud-hint">Tap to walk · drag to look around · pinch to zoom</p>
    ${toast ? `<div class="toast" role="status"><span>${esc(toast)}</span><button class="link" data-action="dismiss-toast">OK</button></div>` : ''}`;
}
