export function homeScreen(): string {
  return `<main class="home">
    <h1 class="title">Field &amp; Flacon</h1>
    <p class="muted">A small perfume house.</p>
    <div class="placeholder placeholder--hero">Placeholder: atelier illustration</div>
    <nav class="menu">
      <button class="big" data-action="nav" data-to="organ">Atelier — the organ</button>
      <button class="big" data-action="nav" data-to="book">Formula book</button>
      <button class="big" disabled>World map (coming in step 4)</button>
    </nav>
    <p class="muted small" id="status"></p>
  </main>`;
}
