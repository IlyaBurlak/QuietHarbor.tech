// Маленькая библиотека консольного интерфейса без зависимостей:
// цвета, рамки, меню со стрелками, ввод с проверкой, скрытый ввод пароля, спиннер, таблицы.
import readline from 'node:readline';
import { on } from 'node:events';

const useColor = () => process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (open, close) => (s) => (useColor() ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

// eslint-disable-next-line no-control-regex
const ANSI = /\x1b\[[0-9;]*m/g;
export const stripAnsi = (s) => String(s).replace(ANSI, '');
export const visibleLength = (s) => [...stripAnsi(s)].length;
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - visibleLength(s)));

export class Cancelled extends Error {
  constructor() {
    super('Отменено');
    this.name = 'Cancelled';
  }
}

/** Рамка вокруг строк текста. */
export function box(lines, { title = '', color = c.cyan, width } = {}) {
  const body = Array.isArray(lines) ? lines : String(lines).split('\n');
  const inner = Math.max(width ?? 0, ...body.map(visibleLength), visibleLength(title) + 2);
  const top = title
    ? `╭─ ${c.bold(title)} ${'─'.repeat(Math.max(0, inner - visibleLength(title) - 1))}╮`
    : `╭${'─'.repeat(inner + 2)}╮`;
  const rows = body.map((l) => `│ ${pad(l, inner)} │`);
  const bottom = `╰${'─'.repeat(inner + 2)}╯`;
  return [top, ...rows, bottom].map((l) => color(l)).join('\n');
}

export const ANCHOR = [
  '      ⚓',
  '   QuietHarbor',
].join('\n');

export function banner(subtitle = '') {
  const lines = [c.bold(c.cyan('  ⚓  QuietHarbor')), c.gray('  Вишлисты, бронь подарков и Тайный Санта')];
  if (subtitle) lines.push('', subtitle);
  return box(lines, { color: c.cyan });
}

/** Таблица «ключ — значение» с выравниванием. */
export function table(rows, { indent = 2 } = {}) {
  const w = Math.max(0, ...rows.map(([k]) => visibleLength(k)));
  return rows.map(([k, v]) => `${' '.repeat(indent)}${pad(c.gray(k), w + (c.gray('').length || 0))}  ${v}`).join('\n');
}

export const ok = (msg) => console.log(`${c.green('✔')} ${msg}`);
export const warn = (msg) => console.log(`${c.yellow('!')} ${msg}`);
export const fail = (msg) => console.log(`${c.red('✖')} ${msg}`);
export const info = (msg) => console.log(`${c.cyan('•')} ${msg}`);
export const title = (msg) => console.log(`\n${c.bold(c.cyan(msg))}\n${c.gray('─'.repeat(Math.min(60, visibleLength(msg) + 4)))}`);

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** Спиннер для долгих операций. Вне терминала просто печатает строку. */
export function spinner(text) {
  if (!process.stdout.isTTY) {
    console.log(`… ${text}`);
    return { update() {}, succeed: (m) => ok(m ?? text), fail: (m) => fail(m ?? text), stop() {} };
  }
  let i = 0;
  let label = text;
  const draw = () => process.stdout.write(`\r\x1b[2K${c.cyan(FRAMES[i++ % FRAMES.length])} ${label}`);
  const timer = setInterval(draw, 80);
  draw();
  const end = (symbol, msg) => {
    clearInterval(timer);
    process.stdout.write(`\r\x1b[2K${symbol} ${msg ?? label}\n`);
  };
  return {
    update: (m) => {
      label = m;
    },
    succeed: (m) => end(c.green('✔'), m),
    fail: (m) => end(c.red('✖'), m),
    stop: () => {
      clearInterval(timer);
      process.stdout.write('\r\x1b[2K');
    },
  };
}

// ---- ввод ----

/** Сохраняет все клавиши одной вставки в буфере до следующего чтения. */
function readKeys(stdin) {
  const keys = on(stdin, 'keypress');
  return {
    async next() {
      const { value: [str, key] } = await keys.next();
      return { str, key: key ?? {} };
    },
    close: () => keys.return(),
  };
}

function rawStart(stdin) {
  readline.emitKeypressEvents(stdin);
  if (stdin.isTTY) stdin.setRawMode(true);
  stdin.resume();
}
function rawStop(stdin) {
  if (stdin.isTTY) stdin.setRawMode(false);
  stdin.pause();
}

const isCtrlC = (k) => k.ctrl && k.name === 'c';

/**
 * Меню выбора стрелками (↑/↓ или j/k), Enter — выбрать, цифра — быстрый выбор, Esc/q — назад.
 * choices: [{ label, value, hint?, disabled? }]. Возвращает value или null при Esc.
 */
export async function select({ message, choices, initial = 0, stdin = process.stdin, out = process.stdout }) {
  const enabled = choices.map((ch, i) => (ch.disabled ? -1 : i)).filter((i) => i >= 0);
  let cursor = enabled.includes(initial) ? initial : (enabled[0] ?? 0);
  let drawn = 0;

  const render = () => {
    const lines = [c.bold(message), ''];
    choices.forEach((ch, i) => {
      const active = i === cursor;
      const num = c.gray(`${String(i + 1).padStart(2)}.`);
      const label = ch.disabled ? c.gray(ch.label) : active ? c.cyan(c.bold(ch.label)) : ch.label;
      const hint = ch.hint ? c.gray(`  ${ch.hint}`) : '';
      lines.push(`${active ? c.cyan('❯') : ' '} ${num} ${label}${hint}`);
    });
    lines.push('', c.gray('↑/↓ — выбор · Enter — открыть · Esc — назад · Ctrl+C — выход'));
    if (drawn) out.write(`\x1b[${drawn}A\x1b[0J`);
    out.write(lines.join('\n') + '\n');
    drawn = lines.length;
  };

  const keys = readKeys(stdin);
  rawStart(stdin);
  try {
    for (;;) {
      render();
      const { str, key } = await keys.next();
      if (isCtrlC(key)) throw new Cancelled();
      if (key.name === 'up' || str === 'k') cursor = enabled[(enabled.indexOf(cursor) - 1 + enabled.length) % enabled.length];
      else if (key.name === 'down' || str === 'j') cursor = enabled[(enabled.indexOf(cursor) + 1) % enabled.length];
      else if (key.name === 'return') {
        out.write(`\x1b[${drawn}A\x1b[0J`);
        out.write(`${c.bold(message)} ${c.cyan(choices[cursor].label)}\n`);
        return choices[cursor].value;
      } else if (key.name === 'escape' || str === 'q') {
        out.write(`\x1b[${drawn}A\x1b[0J`);
        return null;
      } else if (/^[1-9]$/.test(str ?? '') && choices[Number(str) - 1] && !choices[Number(str) - 1].disabled) {
        cursor = Number(str) - 1;
      }
    }
  } finally {
    keys.close();
    rawStop(stdin);
  }
}

/**
 * Ввод строки. secret — звёздочки вместо символов. validate(value) возвращает строку с ошибкой или null.
 * Пустой ввод принимает значение по умолчанию.
 */
export async function input({
  message,
  default: def = '',
  secret = false,
  validate = () => null,
  help = '',
  stdin = process.stdin,
  out = process.stdout,
}) {
  const keys = readKeys(stdin);
  rawStart(stdin);
  try {
    for (;;) {
      let value = '';
      const shown = () => (secret ? '•'.repeat([...value].length) : value);
      const hint = def && !secret ? c.gray(` (${def})`) : def && secret ? c.gray(' (Enter — оставить текущее)') : '';
      if (help) out.write(c.gray(`  ${help}\n`));
      const draw = () => out.write(`\r\x1b[2K${c.cyan('?')} ${c.bold(message)}${hint} › ${shown()}`);
      draw();
      let submitted = false;
      while (!submitted) {
        const { str, key } = await keys.next();
        if (isCtrlC(key)) {
          out.write('\n');
          throw new Cancelled();
        }
        if (key.name === 'return') submitted = true;
        else if (key.name === 'backspace') value = [...value].slice(0, -1).join('');
        else if (key.name === 'escape') {
          out.write('\n');
          return null;
        } else if (str && !key.ctrl && !key.meta && str >= ' ') value += str;
        if (!submitted) draw();
      }
      out.write('\n');
      const final = value === '' ? def : value;
      const err = validate(final);
      if (err) {
        out.write(`${c.red('✖')} ${err}\n`);
        continue;
      }
      return final;
    }
  } finally {
    keys.close();
    rawStop(stdin);
  }
}

export async function confirm({ message, default: def = false, stdin = process.stdin, out = process.stdout }) {
  const keys = readKeys(stdin);
  rawStart(stdin);
  try {
    out.write(`${c.cyan('?')} ${c.bold(message)} ${c.gray(def ? '(Д/н)' : '(д/Н)')} › `);
    for (;;) {
      const { str, key } = await keys.next();
      if (isCtrlC(key)) {
        out.write('\n');
        throw new Cancelled();
      }
      let answer;
      if (key.name === 'return') answer = def;
      else if (/^[дyDY]$/.test(str ?? '')) answer = true;
      else if (/^[нnNН]$/.test(str ?? '') || key.name === 'escape') answer = false;
      else continue;
      out.write(`${answer ? c.green('да') : c.yellow('нет')}\n`);
      return answer;
    }
  } finally {
    keys.close();
    rawStop(stdin);
  }
}

/** Ждёт Enter (после вывода результата, чтобы меню не затёрло его). */
export async function pause(text = 'Нажмите Enter, чтобы вернуться в меню…', stdin = process.stdin, out = process.stdout) {
  const keys = readKeys(stdin);
  rawStart(stdin);
  try {
    out.write(c.gray(text));
    for (;;) {
      const { key } = await keys.next();
      if (isCtrlC(key)) {
        out.write('\n');
        throw new Cancelled();
      }
      if (key.name === 'return' || key.name === 'escape') {
        out.write('\n');
        return;
      }
    }
  } finally {
    keys.close();
    rawStop(stdin);
  }
}
