// Regenerates the materials part of docs/FACT_CHECK.md from src/data/materials.json: every
// material with core facts to confirm, and every material's reference numbers to confirm.
// Run after editing materials: npm run factcheck

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'docs/FACT_CHECK.md';
const START = '<!-- generated:materials -->';
const END = '<!-- /generated:materials -->';

const materials = JSON.parse(readFileSync('src/data/materials.json', 'utf8'));
const cell = (v) => String(v ?? '').replaceAll('|', '/').replaceAll('\n', ' ');
const at = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const course = (m) => (m.course.mission ? `Course mission ${m.course.mission}` : 'Outside the roadmap');
const show = (field, value) => (field === 'ifraLimit' && value === null ? 'not restricted' : field === 'dilution' ? `${value}%` : field === 'costPerKg' ? `about €${value}` : value);

const core = materials
  .filter((m) => !m.verified)
  .map((m) => `| \`${m.id}\` | ${cell(m.name)} | ${m.check.map((f) => `**${f}**: ${cell(at(m, f))}`).join('<br>')} | ${course(m)} |`);
const ref = materials
  .filter((m) => !m.ref.verified)
  .map((m) => `| \`${m.id}\` | ${cell(m.name)} | ${m.ref.check.map((f) => `**${f}**: ${cell(show(f, m.ref[f]))}`).join(' · ')} |`);

const block = `${START}
_Generated from \`src/data/materials.json\` by \`npm run factcheck\`; edit the data, not this table._

### Core facts

| id | Material | To confirm (current value) | Course |
| -- | -------- | -------------------------- | ------ |
${core.join('\n')}

### Reference numbers

Added in Phase C (Oct 28, 2026) from general knowledge of public references (supplier data sheets, IFRA standards), all unconfirmed. \`year\` is when a synthetic came into use, or the era a natural was in use by (before 1500 means antiquity or the Middle Ages). \`tenacityHours\` is time on a smelling strip. \`dilution\` is the strength it's usually worked at. \`ifraLimit\` is the maximum percent in a finished fine fragrance (IFRA category 4). \`costPerKg\` is a rough price.

| id | Material | To confirm (current value) |
| -- | -------- | -------------------------- |
${ref.join('\n')}
${END}`;

let text = readFileSync(FILE, 'utf8');
if (text.includes(START)) {
  text = text.slice(0, text.indexOf(START)) + block + text.slice(text.indexOf(END) + END.length);
} else {
  // First run: replace the hand-written materials table.
  const heading = '## Materials — `src/data/materials.json`';
  const start = text.indexOf(heading) + heading.length;
  const end = text.indexOf('## Accords');
  text = `${text.slice(0, start)}\n\n${block}\n\n${text.slice(end)}`;
}
writeFileSync(FILE, text);
console.log(`${core.length} materials with core facts and ${ref.length} with reference numbers to confirm.`);
