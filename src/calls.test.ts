import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callApp, monitorSources, parseSourceOutputs } from './detect.ts';
import { readCall, track, type Tracker } from './active.ts';
import { elapsed, statusLine } from './status.ts';
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

test('status line', () => {
  assert.equal(elapsed(12 * 60_000 + 5000), '12 min');
  assert.equal(elapsed(65 * 60_000), '1 h 05');
  assert.equal(statusLine(undefined, 0, true), null);
  assert.equal(statusLine({ available: true, active: false }, 0, true), null);
  assert.deepEqual(statusLine({ available: false, active: false }, 0, true)!.text, { en: 'Calls unavailable', es: 'Llamadas no disponibles' });
  const l = statusLine({ available: true, active: true, app: 'Teams', since: 0 }, 12 * 60_000, true)!;
  assert.deepEqual(l, { text: { en: 'On a call · 12 min', es: 'En llamada · 12 min' }, sub: 'Teams' });
  assert.equal(statusLine({ available: true, active: true, app: 'Teams', since: 0 }, 0, false)!.sub, undefined);
});

test('plugin shape and demo', () => {
  assert.equal(plugin.id, 'calls');
  const w = plugin.widgets![0]!;
  assert.equal(w.id, 'status');
  assert.deepEqual(w.sources, ['calls/active']);
  const demo = w.demo!({ options: {} as never, now: 1e6, locale: 'en' });
  const st = { options: { showApp: true, onlyDuringCall: true, takeOver: true }, data: undefined, sources: demo.sources!, now: 1e6, working: true };
  assert.equal(w.visible!(st), true);
  assert.equal(w.urgent!(st), true);
  assert.equal(w.idle!(st), false);
  assert.equal(w.visible!({ ...st, sources: {} }), false);
  assert.equal(plugin.sources![0]!.demo!({ now: 0, locale: 'en' }).active, true);
});
