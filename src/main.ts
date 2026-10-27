import './style.css';
import { STARTER_INGREDIENTS } from './game/ingredients';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <main class="shop">
    <h1>Scent Roads</h1>
    <p class="tagline">A little perfume house at the end of the road.</p>
    <ul class="shelf">
      ${STARTER_INGREDIENTS.map((i) => `<li><span>${i.name}</span><small>${i.tier}</small></li>`).join('')}
    </ul>
  </main>
`;
