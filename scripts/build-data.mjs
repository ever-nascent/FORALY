/**
 * Turns the Discord export into data/wrapped.json.
 *
 * Input:  data/export/*.json  — DiscordChatExporter JSON ("Exportformat: Json").
 *         data/config.json    — timezone, the two people, the two chosen quotes.
 * Output: data/wrapped.json   — the single file the site reads.
 *
 * Every figure here is counted from the export. Nothing is rounded to look
 * better and nothing is invented; if a statistic cannot be computed honestly
 * this script fails rather than guessing.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => resolve(root, ...parts);

/** A pause longer than this ends a conversation. */
const SESSION_GAP_MINUTES = 60;
/** Messages before this hour belong to the night before. */
const NIGHT_ENDS_HOUR = 6;
/** Words shorter than this are noise however often they appear. */
const MIN_WORD_LENGTH = 3;

function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

// --- reading the export ------------------------------------------------------

async function loadExport() {
  const dir = p('data/export');
  let names;
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort();
  } catch {
    die('No data/export directory. Put the DiscordChatExporter JSON export in data/export/.');
  }
  if (names.length === 0) die('data/export holds no .json files.');

  const seen = new Map();
  for (const name of names) {
    const parsed = JSON.parse(await readFile(join(dir, name), 'utf8'));

    if (Array.isArray(parsed) && parsed[0] && 'Contents' in parsed[0]) {
      die(
        `${name} looks like a Discord personal data package. It records only your own\n` +
          'messages and no author on each one, so it cannot produce the who-said-more card.\n' +
          'Export the channel with DiscordChatExporter in JSON format instead.'
      );
    }
    if (!Array.isArray(parsed?.messages)) {
      die(`${name} is not a DiscordChatExporter JSON export (no "messages" array).`);
    }
    for (const message of parsed.messages) seen.set(message.id, message);
  }

  const messages = [...seen.values()]
    .filter((m) => m.type === 'Default' || m.type === 'Reply')
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  if (messages.length === 0) die('The export contains no ordinary messages.');
  return messages;
}

// --- time --------------------------------------------------------------------

function clockReader(timeZone) {
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (iso) => {
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) die(`Unreadable timestamp in the export: ${iso}`);
    const parts = Object.fromEntries(
      format.formatToParts(at).map((part) => [part.type, part.value])
    );
    const hour = Number(parts.hour) % 24;
    return {
      at,
      day: `${parts.year}-${parts.month}-${parts.day}`,
      minuteOfDay: hour * 60 + Number(parts.minute),
    };
  };
}

function dayAfter(day) {
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function longMonthDay(day, timeZone) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'long' }).format(
    new Date(`${day}T12:00:00Z`)
  );
}

function clockPhrase(minuteOfDay) {
  const hour24 = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? 'am' : 'pm';
  return minute === 0
    ? `${hour} ${suffix}`
    : `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

// --- words -------------------------------------------------------------------

const URL_PATTERN = /https?:\/\/\S+/gu;
const CUSTOM_EMOJI = /<a?:\w+:\d+>/gu;
const MENTION = /<[@#!&]\S+?>/gu;

function plainText(content) {
  return (content ?? '').replace(URL_PATTERN, ' ').replace(CUSTOM_EMOJI, ' ').replace(MENTION, ' ');
}

/** A word is a run of letters, numbers or apostrophes. Links and mentions are not words. */
function words(content) {
  return plainText(content).match(/[\p{L}\p{N}][\p{L}\p{N}']*/gu) ?? [];
}

// --- the statistics ----------------------------------------------------------

function build(messages, config) {
  const read = clockReader(config.timezone);
  const her = config.people.her.discordId;
  const him = config.people.him.discordId;

  const rows = messages.map((message) => ({
    id: message.id,
    authorId: message.author?.id,
    content: message.content ?? '',
    ...read(message.timestamp),
  }));

  const ids = new Set(rows.map((row) => row.authorId));
  for (const [who, id] of [
    ['her', her],
    ['him', him],
  ]) {
    if (!id) die(`data/config.json: people.${who}.discordId is empty.`);
    if (!ids.has(id)) {
      die(
        `No messages from people.${who}.discordId (${id}).\n` +
          `Author ids in the export: ${[...ids].join(', ')}`
      );
    }
  }

  const counts = { [her]: 0, [him]: 0 };
  const perDay = new Map();
  const hours = new Array(24).fill(0);
  let totalWords = 0;
  let laughs = 0;
  const herWords = new Map();

  const laughPatterns = config.laughPatterns.map((s) => s.toLowerCase());
  const stopwords = new Set(config.stopwords.map((s) => s.toLowerCase()));

  for (const row of rows) {
    if (row.authorId in counts) counts[row.authorId] += 1;
    perDay.set(row.day, (perDay.get(row.day) ?? 0) + 1);
    hours[Math.floor(row.minuteOfDay / 60)] += 1;

    const tokens = words(row.content);
    totalWords += tokens.length;

    const lowered = plainText(row.content).toLowerCase();
    if (laughPatterns.some((pattern) => lowered.includes(pattern))) laughs += 1;

    if (row.authorId === her) {
      for (const token of tokens) {
        const word = token.toLowerCase();
        if (word.length < MIN_WORD_LENGTH || stopwords.has(word)) continue;
        herWords.set(word, (herWords.get(word) ?? 0) + 1);
      }
    }
  }

  // Longest run of consecutive days that both of them showed up for.
  const days = [...perDay.keys()].sort();
  let streak = 0;
  let run = 0;
  let previous = null;
  for (const day of days) {
    run = previous && dayAfter(previous) === day ? run + 1 : 1;
    streak = Math.max(streak, run);
    previous = day;
  }

  const peakHour = hours.indexOf(Math.max(...hours));

  // Sessions: runs of messages with no pause longer than SESSION_GAP_MINUTES.
  const sessions = [];
  let current = null;
  let longestGapMs = 0;
  let latest = null;

  for (const [index, row] of rows.entries()) {
    const gapMs = index === 0 ? 0 : row.at - rows[index - 1].at;
    const continues = index > 0 && gapMs <= SESSION_GAP_MINUTES * 60_000;
    if (index > 0) longestGapMs = Math.max(longestGapMs, gapMs);

    if (!continues) {
      current = { first: row, last: row, count: 1 };
      sessions.push(current);
    } else {
      current.last = row;
      current.count += 1;
    }

    // How far into the small hours a conversation already under way ever ran.
    if (continues && row.minuteOfDay < NIGHT_ENDS_HOUR * 60) {
      if (!latest || row.minuteOfDay > latest.minuteOfDay) latest = row;
    }
  }

  const longestSession = sessions.reduce((best, s) => (s.count > best.count ? s : best));
  const [topWord, topWordCount] = [...herWords.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0] ?? [null, 0];

  if (!topWord) die('Could not find a most-used word for her. Check people.her.discordId.');
  if (!latest) die('No message landed in the small hours during a conversation already running.');

  const pick = (key) => {
    const id = config.quotes[key];
    if (!id) die(`data/config.json: quotes.${key} is empty. Pick a message id from the export.`);
    const row = rows.find((r) => r.id === id);
    if (!row) die(`data/config.json: quotes.${key} (${id}) is not in the export.`);
    if (!row.content.trim()) die(`data/config.json: quotes.${key} has no text.`);
    return row;
  };

  const first = pick('first');
  const closing = pick('closing');
  if (closing.authorId !== her) {
    die('The closing card has to be something she said. quotes.closing is not one of hers.');
  }

  const herName = config.people.her.name;
  const himName = config.people.him.name;
  const sheWroteMore = counts[her] > counts[him];

  const start = config.range.start || days[0];
  const end = config.range.end || days[days.length - 1];

  return {
    meta: {
      placeholder: false,
      generatedAt: new Date().toISOString(),
      range: { start, end },
      timezone: config.timezone,
      people: { her: herName, him: himName },
    },
    cards: [
      {
        kind: 'opening',
        title: 'Discord Wrapped',
        dateline: `${longMonthDay(start, config.timezone)} — ${longMonthDay(end, config.timezone)}`,
        caption: 'Counted from the log, not from memory.',
      },
      {
        kind: 'figure',
        value: rows.length,
        format: 'integer',
        unit: 'messages',
        countUp: true,
        caption: 'This is how much we said to each other.',
      },
      {
        kind: 'figure',
        value: totalWords,
        format: 'integer',
        unit: 'words',
        countUp: true,
        caption: 'Typos included.',
      },
      {
        kind: 'split',
        format: 'integer',
        sides: [
          { label: herName, value: counts[her] },
          { label: himName, value: counts[him] },
        ],
        caption: sheWroteMore ? 'You wrote more of them.' : 'I wrote more of them.',
      },
      {
        kind: 'figure',
        value: peakHour * 60,
        format: 'clock',
        caption: 'The hour we talk in most.',
      },
      {
        kind: 'figure',
        value: streak,
        format: 'integer',
        unit: streak === 1 ? 'day' : 'days',
        caption: 'Days in a row without a gap.',
      },
      {
        kind: 'word',
        word: topWord,
        value: topWordCount,
        unit: 'times',
        caption: 'The word you used more than any other.',
      },
      {
        kind: 'figure',
        value: laughs,
        format: 'integer',
        countUp: true,
        caption: 'Times one of us typed a laugh.',
      },
      {
        kind: 'quote',
        text: first.content,
        author: first.authorId === her ? herName : himName,
        timestamp: messages.find((m) => m.id === first.id).timestamp,
        caption: first.authorId === her ? 'The first thing you said to me.' : 'How this started.',
        footnote: `${longMonthDay(first.day, config.timezone)}, ${clockPhrase(first.minuteOfDay)}`,
      },
      {
        kind: 'figure',
        value: latest.minuteOfDay,
        format: 'clock',
        caption: 'The latest we ever stayed up talking.',
        footnote: longMonthDay(latest.day, config.timezone),
      },
      {
        kind: 'figure',
        value: longestSession.count,
        format: 'integer',
        unit: 'messages',
        caption: 'The longest we went without stopping.',
        footnote: `${longMonthDay(longestSession.first.day, config.timezone)}, starting ${clockPhrase(
          longestSession.first.minuteOfDay
        )}`,
      },
      {
        kind: 'figure',
        value: Math.floor(longestGapMs / 3_600_000),
        format: 'integer',
        unit: 'hours',
        caption: 'The longest we went quiet.',
      },
      {
        kind: 'closing',
        text: closing.content,
        author: herName,
      },
    ],
  };
}

// --- run ---------------------------------------------------------------------

const config = JSON.parse(await readFile(p('data/config.json'), 'utf8'));
if (!config.timezone) die('data/config.json: timezone is empty.');

const wrapped = build(await loadExport(), config);
await writeFile(p('data/wrapped.json'), `${JSON.stringify(wrapped, null, 2)}\n`);

console.log(`\n${wrapped.meta.range.start} to ${wrapped.meta.range.end} (${config.timezone})\n`);
for (const card of wrapped.cards) {
  const figure =
    card.kind === 'split'
      ? card.sides.map((s) => `${s.label} ${s.value}`).join(' / ')
      : (card.word ?? card.value ?? card.text ?? card.dateline);
  console.log(`  ${String(figure).slice(0, 60).padEnd(62)}${card.caption ?? ''}`);
}
console.log('\nRead every line above before you ship it.\n');
