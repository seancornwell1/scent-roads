const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function formatParts(parts: number): string {
  return Number.isInteger(parts) ? String(parts) : parts.toFixed(1);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function header(title: string): string {
  return `<header class="bar-top">
    <button class="link" data-action="nav" data-to="home">‹ Home</button>
    <h1>${esc(title)}</h1>
    <span></span>
  </header>`;
}
