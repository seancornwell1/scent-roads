import './style.css';
import { recognizeAccords } from './game/accords';
import { content, materialsById, validateContent } from './game/content';
import { addParts, totalParts } from './game/formula';
import { commit, onChange, setDraft, state, type Screen } from './state';
import { bookScreen } from './ui/book';
import { homeScreen } from './ui/home';
import { organScreen } from './ui/organ';

const app = document.querySelector<HTMLDivElement>('#app')!;

const problems = validateContent(content);
if (problems.length > 0) console.error('Content problems:\n' + problems.join('\n'));

function render(): void {
  const { screen } = state.ui;
  app.innerHTML = screen === 'organ' ? organScreen() : screen === 'book' ? bookScreen() : homeScreen();
  showStatus();
}

function showStatus(): void {
  const status = document.querySelector<HTMLParagraphElement>('#status');
  if (status) status.textContent = navigator.onLine ? 'Online' : 'Offline — playing from the saved copy';
}

app.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  const { ui, save } = state;

  switch (action) {
    case 'nav':
      ui.screen = target.dataset.to as Screen;
      ui.detail = null;
      window.scrollTo(0, 0);
      break;
    case 'tab':
      ui.organTab = target.dataset.tab as typeof ui.organTab;
      window.scrollTo(0, 0);
      break;
    case 'browse':
      ui.browseBy = target.dataset.by as typeof ui.browseBy;
      break;
    case 'step':
      ui.step = Number(target.dataset.step);
      break;
    case 'add':
    case 'inc':
      return setDraft(addParts(save.draft, id!, ui.step));
    case 'dec':
      return setDraft(addParts(save.draft, id!, -ui.step));
    case 'detail':
      ui.detail = id!;
      break;
    case 'close-detail':
      ui.detail = null;
      break;
    case 'dismiss-accords':
      ui.newAccords = [];
      break;
    case 'clear':
      if (totalParts(save.draft) > 0 && confirm('Clear every material off the organ?')) setDraft({});
      return;
    case 'save': {
      if (totalParts(save.draft) === 0) return;
      const input = document.querySelector<HTMLInputElement>('#save-name');
      const name = input?.value.trim() || `Formula ${save.formulas.length + 1}`;
      const now = Date.now();
      save.formulas.push({
        id: `f${now}`,
        name,
        parts: { ...save.draft },
        accords: recognizeAccords(save.draft, content.accords, materialsById).map((a) => a.id),
        createdAt: now,
      });
      ui.screen = 'book';
      window.scrollTo(0, 0);
      break;
    }
    case 'load-formula': {
      const formula = save.formulas.find((f) => f.id === id);
      if (!formula) return;
      ui.screen = 'organ';
      ui.organTab = 'formula';
      window.scrollTo(0, 0);
      return setDraft({ ...formula.parts });
    }
    case 'delete-formula': {
      const formula = save.formulas.find((f) => f.id === id);
      if (formula && confirm(`Delete "${formula.name}"?`)) save.formulas = save.formulas.filter((f) => f.id !== id);
      break;
    }
    default:
      return;
  }
  commit();
});

window.addEventListener('online', showStatus);
window.addEventListener('offline', showStatus);
onChange(render);
render();
