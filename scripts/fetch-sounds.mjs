// Downloads the sound cues listed in src/data/sounds.json from Freesound (CC0 only).
//
//   node scripts/fetch-sounds.mjs           fetch every cue that has no file yet
//   node scripts/fetch-sounds.mjs glass     fetch (or re-fetch) the named cues
//
// Needs FREESOUND_API_KEY in .env (see .env.example) and network access to freesound.org and
// cdn.freesound.org. For each cue it searches with the cue's `search` words and `duration`
// range, keeps the best-rated CC0 result, saves its high-quality MP3 preview to
// assets/sounds/<cue>.mp3, points the cue's `file` at it, and logs it in CREDITS.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SOUNDS = 'src/data/sounds.json';
const CREDITS = 'CREDITS.md';
const HEADER = '## Sounds';

function apiKey() {
  if (process.env.FREESOUND_API_KEY) return process.env.FREESOUND_API_KEY;
  if (!existsSync('.env')) return null;
  const line = readFileSync('.env', 'utf8').split('\n').find((l) => l.startsWith('FREESOUND_API_KEY='));
  return line?.slice('FREESOUND_API_KEY='.length).trim() || null;
}

async function search(key, cue) {
  const params = new URLSearchParams({
    query: cue.search,
    filter: `license:"Creative Commons 0" duration:[${cue.duration[0]} TO ${cue.duration[1]}]`,
    fields: 'id,name,username,license,url,previews,duration',
    sort: 'rating_desc',
    page_size: '1',
    token: key,
  });
  const response = await fetch(`https://freesound.org/apiv2/search/text/?${params}`);
  if (!response.ok) throw new Error(`search failed: ${response.status} ${await response.text()}`);
  return (await response.json()).results[0] ?? null;
}

function creditRow(id, file, sound) {
  return `| \`assets/${file}\` | ${id}: “${sound.name.replaceAll('|', '/')}” | Freesound | ${sound.username} | CC0 1.0 | ${sound.url} |`;
}

const key = apiKey();
if (!key) {
  console.error('FREESOUND_API_KEY is not set. Add it to .env (see .env.example).');
  process.exit(1);
}

const data = JSON.parse(readFileSync(SOUNDS, 'utf8'));
const asked = process.argv.slice(2);
const ids = asked.length ? asked : Object.keys(data.cues).filter((id) => !data.cues[id].file);
mkdirSync('assets/sounds', { recursive: true });

let credits = readFileSync(CREDITS, 'utf8');
if (!credits.includes(HEADER)) {
  credits += `\n${HEADER}\n\nHigh-quality MP3 previews from Freesound, fetched by \`scripts/fetch-sounds.mjs\`. All CC0.\n\n| File | Cue and title | Source | Author | License | URL |\n| ---- | ------------- | ------ | ------ | ------- | --- |\n`;
}

for (const id of ids) {
  const cue = data.cues[id];
  if (!cue) {
    console.error(`No cue "${id}" in ${SOUNDS}`);
    continue;
  }
  const sound = await search(key, cue);
  if (!sound) {
    console.error(`${id}: no CC0 result for "${cue.search}"`);
    continue;
  }
  if (sound.license !== 'http://creativecommons.org/publicdomain/zero/1.0/' && !/zero/.test(sound.license)) {
    console.error(`${id}: skipped ${sound.url}, license ${sound.license}`);
    continue;
  }
  const audio = await fetch(sound.previews['preview-hq-mp3']);
  if (!audio.ok) throw new Error(`${id}: download failed: ${audio.status}`);
  const file = `sounds/${id}.mp3`;
  writeFileSync(`assets/${file}`, Buffer.from(await audio.arrayBuffer()));
  cue.file = file;
  const lines = credits.split('\n').filter((l) => !l.startsWith(`| \`assets/${file}\``));
  credits = lines.join('\n').trimEnd() + '\n' + creditRow(id, file, sound) + '\n';
  console.log(`${id}: ${sound.name} by ${sound.username} (${sound.duration.toFixed(1)} s) → assets/${file}`);
}

writeFileSync(SOUNDS, JSON.stringify(data, null, 2) + '\n');
writeFileSync(CREDITS, credits);
