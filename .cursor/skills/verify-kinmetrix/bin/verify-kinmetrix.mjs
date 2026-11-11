#!/usr/bin/env node
/**
 * Verification harness for the Kinmetrix static HTML tablet prototype.
 * Invoke from repo root or anywhere; resolves prototype/ via this file's path.
 *
 * Usage:
 *   node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs <command> [args]
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(skillRoot, '../../..');
const prototypeRoot = path.join(repoRoot, 'prototype');

const requireFromPrototype = createRequire(path.join(prototypeRoot, 'package.json'));

const DEFAULT_PORT = Number(process.env.KINMETRIX_VERIFY_PORT || 5174);
const RUN_ID = process.env.KINMETRIX_VERIFY_RUN_ID || 'default';
const STATE_PATH =
  process.env.KINMETRIX_VERIFY_STATE ||
  path.join('/tmp', `kinmetrix-verify-${RUN_ID}.json`);
const ARTIFACTS_ROOT = path.join(skillRoot, 'artifacts');

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function baseFromState(state) {
  return state?.baseUrl || process.env.KINMETRIX_VERIFY_BASE || `http://127.0.0.1:${DEFAULT_PORT}`;
}

function httpGet(url, timeoutMs = 4000, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        httpGet(next, timeoutMs, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status,
          body: Buffer.concat(chunks).toString('utf8'),
          finalUrl: url,
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout fetching ${url}`));
    });
  });
}

function portInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '127.0.0.1');
  });
}

function listenerPidsOnPort(port) {
  try {
    const out = execFileSync('lsof', [`-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
    });
    return out
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  if (!pid) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    /* process group may not exist */
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}

async function waitReady(baseUrl, attempts = 40) {
  const probe = `${baseUrl.replace(/\/$/, '')}/home.html`;
  for (let i = 0; i < attempts; i++) {
    try {
      const { status, body } = await httpGet(probe);
      if (status === 200 && body.includes('data-route="Home"') && body.includes('device-frame')) {
        return true;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function loadViewport() {
  const devicePath = path.join(prototypeRoot, 'visual-compare', 'device.json');
  const device = JSON.parse(fs.readFileSync(devicePath, 'utf8'));
  return {
    width: Number(device.logicalWidth) || 1180,
    height: Number(device.logicalHeight) || 820,
  };
}

async function withPage(fn) {
  let chromium;
  try {
    ({ chromium } = requireFromPrototype('playwright'));
  } catch (err) {
    die(`playwright missing under prototype/: ${err.message}\nRun: cd prototype && yarn`);
  }
  const state = loadState();
  const baseUrl = baseFromState(state);
  const { width, height } = loadViewport();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: width + 48, height: height + 48 },
  });
  try {
    const startPath = state?.lastPath || '/index.html';
    const startUrl = startPath.startsWith('http')
      ? startPath
      : `${baseUrl.replace(/\/$/, '')}${startPath.startsWith('/') ? startPath : `/${startPath}`}`;
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.evaluate(() => {
      if (window.KinPrototype?.mountDebugChrome) window.KinPrototype.mountDebugChrome();
      if (window.KinPrototype?.setDebugOpen) window.KinPrototype.setDebugOpen(false);
      if (window.KinPrototype?.setCompareOpen) window.KinPrototype.setCompareOpen(false);
    });
    const result = await fn(page, { baseUrl, state, width, height });
    if (state) {
      const u = new URL(page.url());
      state.lastPath = u.pathname + u.search;
      state.lastUrl = page.url();
      saveState(state);
    }
    return result;
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function cmdLaunch(args) {
  const port = Number(args.port || process.env.KINMETRIX_VERIFY_PORT || DEFAULT_PORT);
  const existing = loadState();
  if (existing?.pid) {
    try {
      process.kill(existing.pid, 0);
      die(
        `Refusing launch: verify instance already recorded at ${STATE_PATH} (pid ${existing.pid}, ${existing.baseUrl}). Run cleanup first, or set KINMETRIX_VERIFY_RUN_ID for a second isolated run.`,
      );
    } catch {
      // stale state
    }
  }

  if (await portInUse(port)) {
    die(
      `Port ${port} is already in use. Pick another with --port / KINMETRIX_VERIFY_PORT, or stop the other process. Do not drive a shared yarn-dev instance you did not start.`,
    );
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  // stdio must be ignore: piped stdout/stderr keep this process alive after unref.
  const child = spawn(
    'npx',
    ['--yes', 'serve', '-l', String(port), '.'],
    {
      cwd: prototypeRoot,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    },
  );
  child.unref();

  const ready = await waitReady(baseUrl);
  if (!ready) {
    killPid(child.pid);
    for (const pid of listenerPidsOnPort(port)) killPid(pid);
    die(`Launch failed: ${baseUrl}/home.html never became usable (data-route=Home + device-frame).`);
  }

  const listeners = listenerPidsOnPort(port);
  const state = {
    runId: RUN_ID,
    pid: child.pid,
    listenerPids: listeners,
    port,
    baseUrl,
    prototypeRoot,
    lastPath: '/index.html',
    startedAt: new Date().toISOString(),
  };
  saveState(state);
  console.log(
    JSON.stringify(
      {
        ok: true,
        command: 'launch',
        baseUrl,
        port,
        pid: child.pid,
        listenerPids: listeners,
        statePath: STATE_PATH,
        ready: `${baseUrl}/home.html`,
      },
      null,
      2,
    ),
  );
}

async function cmdDoctor() {
  const state = loadState();
  const baseUrl = baseFromState(state);
  const port = state?.port || DEFAULT_PORT;
  const report = {
    ok: true,
    command: 'doctor',
    statePath: STATE_PATH,
    statePresent: Boolean(state),
    baseUrl,
    port,
    pidAlive: false,
    homeStatus: null,
    homeUsable: false,
    ownedByUs: false,
    notes: [],
  };

  if (state?.pid) {
    try {
      process.kill(state.pid, 0);
      report.pidAlive = true;
      report.ownedByUs = true;
    } catch {
      report.notes.push(`Recorded pid ${state.pid} is not running.`);
      report.ok = false;
    }
  } else {
    report.notes.push('No verify state file. Prefer launch before drive.');
    report.ok = false;
  }

  try {
    const { status, body } = await httpGet(`${baseUrl.replace(/\/$/, '')}/home.html`);
    report.homeStatus = status;
    report.homeUsable =
      status === 200 && body.includes('data-route="Home"') && body.includes('device-frame');
    if (!report.homeUsable) {
      report.ok = false;
      report.notes.push('home.html did not look like the Kinmetrix tablet mirror.');
    }
  } catch (err) {
    report.ok = false;
    report.notes.push(`home.html fetch failed: ${err.message}`);
  }

  if (!report.ownedByUs && report.homeUsable) {
    report.ok = false;
    report.notes.push(
      'A server answers, but this run did not start it. Do not drive a shared instance.',
    );
  }

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

async function cmdGoto(args) {
  const pageName = args._[0];
  if (!pageName) die('Usage: goto <page.html|path>');
  const state = loadState();
  if (!state) die('No state. Run launch first.');
  const rel = pageName.replace(/^\//, '');
  const target = rel.endsWith('.html') || rel.includes('.') ? rel : `${rel}.html`;
  await withPage(async (page, { baseUrl }) => {
    await page.goto(`${baseUrl.replace(/\/$/, '')}/${target}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  });
  const s = loadState();
  console.log(JSON.stringify({ ok: true, command: 'goto', lastPath: s.lastPath, lastUrl: s.lastUrl }, null, 2));
}

function locatorFor(page, args) {
  const role = args.role;
  const name = args.name;
  if (role && name) {
    return page.getByRole(role, { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
  }
  if (args.selector) return page.locator(args.selector);
  if (args.text) return page.getByText(args.text, { exact: Boolean(args.exact) });
  die('click/fill need --role and --name, or --selector, or --text');
}

async function cmdClick(args) {
  if (!loadState()) die('No state. Run launch first.');
  await withPage(async (page) => {
    const loc = locatorFor(page, args).first();
    await loc.click({ timeout: 15_000 });
    await page.waitForLoadState('domcontentloaded');
  });
  const s = loadState();
  console.log(JSON.stringify({ ok: true, command: 'click', lastPath: s.lastPath, lastUrl: s.lastUrl }, null, 2));
}

async function cmdFill(args) {
  if (!loadState()) die('No state. Run launch first.');
  const value = args.value;
  if (value === undefined) die('fill requires --value');
  await withPage(async (page) => {
    if (args.label) {
      await page.getByLabel(args.label, { exact: false }).fill(String(value));
      return;
    }
    if (args.id) {
      await page.locator(`#${args.id}`).fill(String(value));
      return;
    }
    await locatorFor(page, args).fill(String(value));
  });
  console.log(JSON.stringify({ ok: true, command: 'fill' }, null, 2));
}

async function cmdAssertRoute(args) {
  const expected = args._[0];
  if (!expected) die('Usage: assert-route <RouteName>');
  if (!loadState()) die('No state. Run launch first.');
  const actual = await withPage(async (page) => page.locator('body').getAttribute('data-route'));
  const ok = actual === expected;
  console.log(JSON.stringify({ ok, command: 'assert-route', expected, actual }, null, 2));
  if (!ok) process.exit(1);
}

async function cmdAssertText(args) {
  const text = args._[0] || args.text;
  if (!text) die('Usage: assert-text "literal"');
  if (!loadState()) die('No state. Run launch first.');
  const found = await withPage(async (page) => {
    const count = await page.getByText(text, { exact: Boolean(args.exact) }).count();
    return count > 0;
  });
  console.log(JSON.stringify({ ok: found, command: 'assert-text', text }, null, 2));
  if (!found) process.exit(1);
}

async function cmdSnapshot(args) {
  if (!loadState()) die('No state. Run launch first.');
  const outPath = args.path;
  if (!outPath) die('snapshot requires --path');
  const abs = path.isAbsolute(outPath) ? outPath : path.join(ARTIFACTS_ROOT, outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const payload = await withPage(async (page) => {
    const route = await page.locator('body').getAttribute('data-route');
    const title = await page.locator('.wire-toolbar__title, h1.login-card__title, h1').first().textContent().catch(() => '');
    const links = await page.locator('a').evaluateAll((els) =>
      els.slice(0, 40).map((a) => ({ text: (a.textContent || '').trim().replace(/\s+/g, ' '), href: a.getAttribute('href') })),
    );
    const aria = await page.locator('.device-frame, body').first().innerText();
    return { route, title: (title || '').trim(), links, aria };
  });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, command: 'snapshot', path: abs, route: payload.route }, null, 2));
}

async function cmdScreenshot(args) {
  if (!loadState()) die('No state. Run launch first.');
  const outPath = args.path;
  if (!outPath) die('screenshot requires --path');
  const abs = path.isAbsolute(outPath) ? outPath : path.join(ARTIFACTS_ROOT, outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await withPage(async (page, { width, height }) => {
    await page.evaluate(() => {
      document.body.classList.add('proto-capture');
    });
    const frame = page.locator('.device-frame').first();
    if ((await frame.count()) > 0) {
      const box = await frame.boundingBox();
      if (!box) die('device-frame has no bounding box');
      await page.screenshot({
        path: abs,
        clip: { x: box.x, y: box.y, width, height },
      });
    } else {
      await page.screenshot({ path: abs, clip: { x: 0, y: 0, width, height } });
    }
  });
  console.log(JSON.stringify({ ok: true, command: 'screenshot', path: abs }, null, 2));
}

async function cmdCleanup() {
  const state = loadState();
  if (!state) {
    console.log(JSON.stringify({ ok: true, command: 'cleanup', note: 'no state file' }, null, 2));
    return;
  }
  const killed = new Set();
  killPid(state.pid);
  if (state.pid) killed.add(state.pid);
  for (const pid of state.listenerPids || []) {
    killPid(pid);
    killed.add(pid);
  }
  // npx may leave the real listener as a grandchild — clear this run's port only.
  if (state.port) {
    for (const pid of listenerPidsOnPort(state.port)) {
      killPid(pid);
      killed.add(pid);
    }
  }
  fs.unlinkSync(STATE_PATH);
  console.log(
    JSON.stringify(
      {
        ok: true,
        command: 'cleanup',
        killedPids: [...killed],
        artifactsKeptUnder: ARTIFACTS_ROOT,
        stateRemoved: STATE_PATH,
      },
      null,
      2,
    ),
  );
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

const commands = {
  launch: () => cmdLaunch(args),
  doctor: () => cmdDoctor(),
  goto: () => cmdGoto(args),
  click: () => cmdClick(args),
  fill: () => cmdFill(args),
  'assert-route': () => cmdAssertRoute(args),
  'assert-text': () => cmdAssertText(args),
  snapshot: () => cmdSnapshot(args),
  screenshot: () => cmdScreenshot(args),
  cleanup: () => cmdCleanup(),
};

if (!command || !commands[command]) {
  die(
    `Usage: verify-kinmetrix <launch|doctor|goto|click|fill|assert-route|assert-text|snapshot|screenshot|cleanup> [...]\nState: ${STATE_PATH}\nArtifacts: ${ARTIFACTS_ROOT}`,
  );
}

await commands[command]();
