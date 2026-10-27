import { characterOptions, type CharacterConfig, type KitStyle } from '../game/character';
import { esc } from './html';

// The character creator: a short panel over the bottom of the scene, with the player
// shown live above it. One page per slot, so the panel never needs to scroll.
// Options come from src/data/character.json and the kit manifest.

export function creatorScreen(style: KitStyle, config: CharacterConfig, tab: string): string {
  const names = new Map(style.parts.map((p) => [p.id, p.name.en ?? p.id]));
  const chip = (action: string, key: string, value: string, label: string, on: boolean) =>
    `<button class="chip ${on ? 'on' : ''}" data-action="${action}" data-key="${esc(key)}" data-value="${esc(value)}">${esc(label)}</button>`;

  const tabs = characterOptions.slots
    .map((s) => `<button class="tab-chip ${s.id === tab ? 'on' : ''}" data-action="look-tab" data-value="${esc(s.id)}">${esc(s.label)}</button>`)
    .join('');

  const slot = characterOptions.slots.find((s) => s.id === tab) ?? characterOptions.slots[0];
  let options: string;
  if (slot.id === 'body') {
    options = style.fits.map((f) => chip('look-fit', 'fit', f.id, f.id.charAt(0).toUpperCase() + f.id.slice(1), config.fit === f.id)).join('');
  } else {
    const none = slot.optional ? chip('look-part', slot.id, '', 'None', !config.parts[slot.id]) : '';
    const allowed = characterOptions.allowedParts[slot.id] ?? [];
    options = none + allowed.map((id) => chip('look-part', slot.id, id, names.get(id) ?? id, config.parts[slot.id] === id)).join('');
  }

  const colors = characterOptions.colors
    .filter((c) => c.tab === slot.id)
    .map((c) => {
      const swatches = (style.palettes[c.palette] ?? [])
        .map(
          (hex) =>
            `<button class="swatch-button ${config.colors[c.id] === hex ? 'on' : ''}" style="--swatch:${esc(hex)}" data-action="look-color" data-key="${esc(c.id)}" data-value="${esc(hex)}" aria-label="${esc(c.label)} ${esc(hex)}"></button>`,
        )
        .join('');
      return `<p class="muted small">${esc(c.label)}</p><div class="swatches">${swatches}</div>`;
    })
    .join('');

  return `<header class="creator-head">
      <h1>Your perfumer</h1>
      <button class="primary" data-action="close-panel">Done</button>
    </header>
    <nav class="tab-chips">${tabs}</nav>
    <div class="chips">${options}</div>
    ${colors}`;
}
