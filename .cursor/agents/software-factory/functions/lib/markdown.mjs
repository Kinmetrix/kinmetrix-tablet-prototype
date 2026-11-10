const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;
const STORY = /^(US-\d{3,})\s*:\s*(.+)$/;
const CRITERIA = /^\W*acceptance criteria\W*$/i;

export const normalizeHeading = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim();

export function splitFrontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/.exec(text);
  if (!match) return { data: null, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (field) data[field[1]] = field[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return { data, body: text.slice(match[0].length) };
}

export function joinFrontMatter(data, body) {
  const lines = Object.entries(data).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\s+/, '')}`;
}

function* outsideFences(markdown) {
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) yield line;
  }
}

export function headings(markdown, level) {
  const out = [];
  for (const line of outsideFences(markdown)) {
    const match = HEADING.exec(line);
    if (match && match[1].length === level) out.push(match[2]);
  }
  return out;
}

/** Text under the `## heading` section, up to the next heading of level 1 or 2. */
export function sectionBody(markdown, heading) {
  const lines = [];
  let inside = false;
  for (const line of outsideFences(markdown)) {
    const match = HEADING.exec(line);
    if (match && match[1].length <= 2) {
      inside = match[1].length === 2 && normalizeHeading(match[2]) === normalizeHeading(heading);
      continue;
    }
    if (inside) lines.push(line);
  }
  return lines.join('\n');
}

/** Stories are `### US-001: Title` blocks with an `Acceptance criteria` line followed by bullets. */
export function parseStories(markdown) {
  const stories = [];
  let current = null;
  let inCriteria = false;
  for (const line of outsideFences(markdown)) {
    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (current && level >= 4) {
        inCriteria = CRITERIA.test(heading[2]);
        continue;
      }
      const story = level === 3 ? STORY.exec(heading[2]) : null;
      current = story ? { id: story[1], title: story[2].trim(), acceptanceCriteria: [] } : null;
      if (current) stories.push(current);
      inCriteria = false;
      continue;
    }
    if (!current) continue;
    if (CRITERIA.test(line.trim())) {
      inCriteria = true;
      continue;
    }
    const bullet = /^\s*[-*]\s+(?:\[[ xX]\]\s+)?(\S.*)$/.exec(line);
    if (inCriteria && bullet) current.acceptanceCriteria.push(bullet[1].trim());
    else if (inCriteria && line.trim() !== '') inCriteria = false;
  }
  return stories;
}
