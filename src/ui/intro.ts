import { story } from '../game/story';
import { esc } from './html';

// The story's opening: you've inherited your grandmother's shop, and her letter.

export function introScreen(): string {
  const { intro } = story;
  const letter = intro.letter.body.map((p) => `<p>${esc(p)}</p>`).join('');
  return `<header class="bar-top"><span></span><h1>${esc(intro.title)}</h1><span></span></header>
    <main class="customer intro">
      ${intro.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}
      <p class="muted small">${esc(intro.letter.heading)}</p>
      <blockquote class="memory letter">${letter}<p class="signoff">${esc(intro.letter.signoff)}</p></blockquote>
      <div class="row-between"><span></span><button class="primary" data-action="start-story">${esc(intro.start)}</button></div>
    </main>`;
}
