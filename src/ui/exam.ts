import { clients } from '../game/clients';
import { feedbackLines } from '../game/feedback';
import { examStage, identifyScore, rankById } from '../game/ranks';
import { materialsById } from '../game/content';
import { state } from '../state';
import { esc, header, starsText } from './html';

// A rank exam: blind identification, then a classic accord built at the organ.

export function examScreen(): string {
  const e = state.save.exam;
  if (!e) return `${header('Exam')}<main class="customer"><p>No exam in progress.</p></main>`;
  const rank = rankById(e.rank);
  const exam = rank.exam!;
  const head = `${header(`Exam: ${rank.name}`)}`;
  const stage = examStage(e);

  if (stage === 'identify') {
    const index = e.answers.findIndex((a) => a === null);
    const q = e.questions[index];
    const m = materialsById.get(q.material)!;
    const options = q.options
      .map((o, i) => `<button class="chip train-option" data-action="exam-answer" data-index="${index}" data-value="${i}">${esc(materialsById.get(o)?.name ?? o)}</button>`)
      .join('');
    return `${head}<main class="customer">
      <p class="muted small">Part one: blind identification · question ${index + 1} of ${e.questions.length} · you need ${exam.identify.pass} right</p>
      <p><strong>Which material is this?</strong></p>
      <blockquote class="memory">“${esc(m.character)}”</blockquote>
      <div class="chips train-options">${options}</div>
    </main>`;
  }

  const named = identifyScore(e);
  const part1 = `<p class="small">Part one: you named <strong>${named} of ${e.questions.length}</strong>.</p>`;
  if (stage === 'failed-identify') {
    const missed = e.questions.filter((q, i) => e.answers[i] !== q.answer).map((q) => materialsById.get(q.material)!.name);
    return `${head}<main class="customer">${part1}
      <p>Not this time: you needed ${exam.identify.pass}. You missed ${esc(missed.join(', '))}. Train your nose on them and come back.</p>
      <div class="row-between"><button class="link" data-action="close-panel">Later</button><button class="primary" data-action="start-exam">Try again</button></div>
    </main>`;
  }

  if (stage === 'accord') {
    return `${head}<main class="customer">${part1}
      <h2>Part two: the accord</h2>
      <blockquote class="memory">“${esc(exam.accord.memory)}”</blockquote>
      ${exam.accord.hints.map((h) => `<p class="hint">“${esc(h)}”</p>`).join('')}
      <p class="muted small">Compose it at the organ and hand it in. The examiners judge it at once, with their own materials. It needs three stars.</p>
      <div class="row-between"><button class="link" data-action="close-panel">Later</button><button class="primary" data-action="exam-compose">Compose at the organ</button></div>
    </main>`;
  }

  const r = e.accord!;
  const lines = feedbackLines(r, 3).map((l) => `<p>“${esc(l)}”</p>`).join('');
  if (stage === 'passed') {
    return `${head}<main class="customer">${part1}
      <p class="stars" aria-label="${r.stars} of 3 stars">${starsText(r.stars)}</p>
      <h2>You passed: ${esc(rank.name)}</h2>
      <p>${esc(rank.about)}</p>
      <div class="row-between"><span></span><button class="primary" data-action="exam-finish">Wonderful</button></div>
    </main>`;
  }
  return `${head}<main class="customer">${part1}
    <p class="stars" aria-label="${r.stars} of 3 stars">${starsText(r.stars)}</p>
    <p class="muted small">The examiners say:</p>
    ${lines}
    <p>Not quite three stars. You can try the accord again.</p>
    <div class="row-between"><button class="link" data-action="close-panel">Later</button><button class="primary" data-action="exam-retry-accord">Try the accord again</button></div>
    <p class="muted small">${esc(clients.lines.feedback.lastTime)} the examiners keep their notes.</p>
  </main>`;
}
