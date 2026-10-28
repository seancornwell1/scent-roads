import { content, familiesById, materialsById } from '../game/content';
import { currentStreak, dayNumber, mastery, nextQuestion, training, type Question } from '../game/learning';
import { state } from '../state';
import { esc, header } from './html';
import { masteryDots } from './compendium';

// Daily nose training at the organ: a few quick questions, then come back tomorrow.

function optionLabel(q: Question, option: string): string {
  if (q.kind === 'identify') return materialsById.get(option)?.name ?? option;
  if (q.kind === 'family') return familiesById.get(option)?.name ?? option;
  return training.layerNames[option as keyof typeof training.layerNames];
}

function prompt(q: Question): string {
  const m = materialsById.get(q.material)!;
  const text = training.prompts[q.kind].replace('{name}', m.name);
  return q.kind === 'identify' ? `<p><strong>${esc(text)}</strong></p><blockquote class="memory">“${esc(m.character)}”</blockquote>` : `<p><strong>${esc(text)}</strong></p>`;
}

export function trainingScreen(): string {
  const learning = state.save.learning!;
  const today = learning.today!;
  const day = dayNumber(new Date());
  const streak = currentStreak(learning, day);
  const shown = state.ui.trainingFeedback;
  const total = today.questions.length;
  const head = `${header('Nose training')}<p class="muted small">Streak: <strong>${streak} day${streak === 1 ? '' : 's'}</strong>. A few questions a day; materials you know well come back less often.</p>`;

  if (total === 0) {
    return `${head}<main class="customer"><p>Nothing is due today: every material you have is resting. Come back tomorrow.</p></main>`;
  }

  // The answer to the question just answered.
  if (shown !== null) {
    const q = today.questions[shown];
    const m = materialsById.get(q.material)!;
    const right = today.answers[shown] === q.answer;
    const more = nextQuestion(learning) >= 0;
    return `${head}<main class="customer">
      <p class="muted small">Question ${shown + 1} of ${total}</p>
      <p class="banner small"><span>${right ? 'Right!' : `Not quite: it's <strong>${esc(optionLabel(q, q.options[q.answer]))}</strong>.`}</span></p>
      <p><strong>${esc(m.name)}</strong> · ${esc(familiesById.get(m.family)?.name ?? m.family)}, ${esc(m.subfamily)} · ${training.layerNames[m.layer]}</p>
      <p class="small">${esc(m.character)}</p>
      <p class="small">Mastery ${masteryDots(mastery(learning, m.id))}</p>
      <div class="row-between"><span></span><button class="primary" data-action="train-next">${more ? 'Next' : 'Finish'}</button></div>
    </main>`;
  }

  const index = nextQuestion(learning);
  if (index < 0) {
    const right = today.questions.filter((q, i) => today.answers[i] === q.answer).length;
    return `${head}<main class="customer">
      <h2>Done for today</h2>
      <p>${right} of ${total} right. Come back tomorrow to keep your streak.</p>
      <ul class="plain small">${today.questions.map((q) => `<li>${esc(materialsById.get(q.material)!.name)} ${masteryDots(mastery(learning, q.material))}</li>`).join('')}</ul>
      <div class="row-between"><span></span><button class="primary" data-action="close-panel">Back to the shop</button></div>
    </main>`;
  }

  const q = today.questions[index];
  const options = q.options.map((o, i) => `<button class="chip train-option" data-action="train-answer" data-index="${index}" data-value="${i}">${esc(optionLabel(q, o))}</button>`).join('');
  return `${head}<main class="customer">
      <p class="muted small">Question ${index + 1} of ${total} · ${content.families.length} families, three layers</p>
      ${prompt(q)}
      <div class="chips train-options">${options}</div>
    </main>`;
}
