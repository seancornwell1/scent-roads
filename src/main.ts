import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

// Placeholder home screen: plain labeled boxes until real art exists (see ASSETS_NEEDED.md).
app.innerHTML = `
  <main class="home">
    <h1>Scent Roads</h1>
    <p class="tagline">A small perfume house. Coming soon.</p>
    <div class="placeholder placeholder--hero">Placeholder: atelier illustration</div>
    <nav class="menu">
      <button class="placeholder" disabled>World map</button>
      <button class="placeholder" disabled>Atelier</button>
      <button class="placeholder" disabled>Formula book</button>
    </nav>
    <p class="status" id="status"></p>
  </main>
`;

const status = document.querySelector<HTMLParagraphElement>('#status')!;
const showStatus = () => {
  status.textContent = navigator.onLine ? 'Online' : 'Offline — playing from the saved copy';
};
window.addEventListener('online', showStatus);
window.addEventListener('offline', showStatus);
showStatus();
