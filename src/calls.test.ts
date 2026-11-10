import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callApp, monitorSources, parseSourceOutputs } from './detect.ts';
import { createBaseContext, DEFAULT_WORKDAY } from '@kiosko/sdk';
import { graceFor, readCall, track, type Tracker } from './active.ts';
import { statusLine } from './status.ts';
import plugin from './index.ts';

const OUTPUTS = `Source Output #42
\tDriver: protocol-native.c
\tSource: 3
\tProperties:
\t\tapplication.name = "Firefox"
\t\tapplication.process.binary = "firefox"
Source Output #43
\tSource: 1
\tProperties:
\t\tapplication.name = "OBS"
\t\tapplication.process.binary = "obs"
`;
const SOURCES = '1\talsa_output.pci.analog-stereo.monitor\tPipeWire\ts32le 2ch 48000Hz\tSUSPENDED\n3\talsa_input.usb-mic\tPipeWire\ts16le 1ch 48000Hz\tRUNNING\n';

test('parses pactl output and finds the app holding a microphone', () => {
  const outs = parseSourceOutputs(OUTPUTS);
  assert.equal(outs.length, 2);
  assert.equal(outs[0]!.source, 3);
  assert.equal(outs[0]!.props['application.process.binary'], 'firefox');
  const mon = monitorSources(SOURCES);
  assert.deepEqual([...mon], [1]);
  assert.equal(callApp(outs, mon), 'Firefox');
  assert.equal(callApp(outs, new Set([1, 3])), null, 'monitors are not mics');
  assert.equal(callApp(outs, mon, ['teams']), null, 'app not in the list');
  assert.equal(callApp([outs[1]!], new Set(), []), 'OBS', 'empty list = any app');
  assert.equal(callApp(parseSourceOutputs(OUTPUTS.replace(/firefox/g, 'chrome-wrapper').replace('Firefox', 'Google Chrome')), mon), 'Chrome');
  assert.equal(callApp([], mon), null);
});

test('keeps the start of the call across reads, with a grace gap', () => {
  const tr: Tracker = { since: null, lastSeen: 0 };
  assert.deepEqual(track(tr, 'Teams', 1000, 100), { available: true, active: true, app: 'Teams', since: 1000 });
  assert.equal(track(tr, 'Teams', 1050, 100).since, 1000);
  assert.equal(track(tr, null, 1100, 100).active, false);
  assert.equal(track(tr, 'Teams', 1120, 100).since, 1000, 'short blip: same call');
  track(tr, null, 1300, 100);
  assert.equal(track(tr, 'Teams', 1400, 100).since, 1400, 'long gap: new call');
});

test('degrades to unavailable off Linux or without pactl', async () => {
  assert.deepEqual(await readCall({ apps: [], now: 0, os: 'darwin' }), { available: false, active: false });
  const fail = async () => { throw Object.assign(new Error('spawn pactl ENOENT'), { code: 'ENOENT' }); };
  assert.deepEqual(await readCall({ apps: [], now: 0, os: 'linux', exec: fail }), { available: false, active: false });
  const ok = async (args: string[]) => (args[1] === 'source-outputs' ? OUTPUTS : SOURCES);
  const r = await readCall({ apps: ['firefox'], now: 5, os: 'linux', exec: ok, state: { since: null, lastSeen: 0 } });
  assert.deepEqual(r, { available: true, active: true, app: 'Firefox', since: 5 });
});

test('status line: ctx.fmt durations and an optional text of your own', () => {
  const { fmt } = createBaseContext({ now: 0, locale: 'es' });
  const o = { showApp: true, label: '' };
  const call = { available: true, active: true, app: 'Teams', since: 0 };
  assert.equal(statusLine(undefined, 0, o, fmt), null);
  assert.equal(statusLine({ available: true, active: false }, 0, o, fmt), null);
  assert.deepEqual(statusLine({ available: false, active: false }, 0, o, fmt)!.text, { en: 'Calls unavailable', es: 'Llamadas no disponibles' });
  assert.deepEqual(statusLine(call, 12 * 60_000 + 5000, o, fmt), { text: { en: 'On a call · 12 min', es: 'En llamada · 12 min' }, sub: 'Teams' });
  assert.deepEqual(statusLine(call, 65 * 60_000, o, fmt)!.text, { en: 'On a call · 1 h 05', es: 'En llamada · 1 h 05' });
  assert.equal(statusLine(call, 0, { ...o, showApp: false }, fmt)!.sub, undefined);
  assert.equal(statusLine(call, 60_000, { ...o, label: ' ON AIR ' }, fmt)!.text, 'ON AIR · 1 min');
});

test('the grace gap follows the read interval the user set', async () => {
  assert.equal(graceFor(15_000), 37_500);
  // Read every minute: a call seen on two reads in a row is one call, not two.
  const ok = async (args: string[]) => (args[1] === 'source-outputs' ? OUTPUTS : SOURCES);
  const state: Tracker = { since: null, lastSeen: 0 };
  const a = await readCall({ apps: [], now: 100_000, intervalMs: 60_000, os: 'linux', exec: ok, state });
  const b = await readCall({ apps: [], now: 160_000, intervalMs: 60_000, os: 'linux', exec: ok, state });
  assert.equal(b.since, a.since);
});

test('plugin shape and demo', () => {
  assert.equal(plugin.id, 'calls');
  const w = plugin.widgets![0]!;
  assert.equal(w.id, 'status');
  assert.deepEqual(w.sources, ['calls/active']);
  const demo = w.demo!({ options: {} as never, now: 1e6, locale: 'en' });
  const st = { options: { label: '', showApp: true, onlyDuringCall: true }, data: undefined, sources: demo.sources!, now: 1e6, working: true, workday: DEFAULT_WORKDAY };
  assert.equal(w.visible!(st), true);
  assert.equal(w.urgent!(st), true);
  assert.equal(w.takeOver, false, 'keeping the tile during a call is opt-in');
  assert.equal('takeOver' in (w.options as { props: object }).props, false, 'the instance switch, not an option');
  assert.equal(plugin.sources![0]!.timeoutMs, 10_000);
  assert.equal(w.idle!(st), false);
  assert.equal(w.visible!({ ...st, sources: {} }), false);
  assert.equal(plugin.sources![0]!.demo!({ now: 0, locale: 'en' }).active, true);
});
