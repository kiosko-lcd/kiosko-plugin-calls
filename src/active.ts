/**
 * The `active` source: whether you're on a call right now, which app holds
 * the microphone and since when. Linux with PulseAudio or PipeWire
 * (pipewire-pulse) only; elsewhere, or without `pactl`, it reports
 * `available: false` and never throws.
 */
import { execFile } from 'node:child_process';
import { platform } from 'node:os';
import { promisify } from 'node:util';
import { defineSource, t } from '@kiosko/sdk';
import { CALL_BINARIES, callApp, monitorSources, parseSourceOutputs } from './detect.ts';

const run = promisify(execFile);

export interface CallState {
  /** False when calls can't be detected here (not Linux, no pactl, no sound server). */
  available: boolean;
  active: boolean;
  /** Who holds the mic: "Chrome", "Teams"… */
  app?: string;
  /** Epoch ms when the current call started. */
  since?: number;
}

export interface Tracker {
  since: number | null;
  lastSeen: number;
}

/**
 * Keeps `since` across reads. A short gap (under `graceMs`, e.g. the mic
 * reopening when switching devices) doesn't start a new call.
 */
export function track(tr: Tracker, app: string | null, now: number, graceMs: number): CallState {
  if (app) {
    if (tr.since === null || now - tr.lastSeen > graceMs) tr.since = now;
    tr.lastSeen = now;
    return { available: true, active: true, app, since: tr.since };
  }
  if (tr.since !== null && now - tr.lastSeen > graceMs) tr.since = null;
  return { available: true, active: false };
}

const tracker: Tracker = { since: null, lastSeen: 0 };
const INTERVAL = 15_000;

export type Pactl = (args: string[], signal?: AbortSignal) => Promise<string>;

const pactl: Pactl = async (args, signal) => (await run('pactl', args, { timeout: 3000, env: { ...process.env, LC_ALL: 'C' }, ...(signal ? { signal } : {}) })).stdout;

/**
 * How long the mic may be closed without ending the call (switching
 * devices reopens it): two and a half reads, whatever the interval.
 */
export const graceFor = (intervalMs: number) => 2.5 * intervalMs;

export async function readCall(o: { apps: string[]; now: number; intervalMs?: number; signal?: AbortSignal; exec?: Pactl; os?: string; state?: Tracker }): Promise<CallState> {
  if ((o.os ?? platform()) !== 'linux') return { available: false, active: false };
  const exec: Pactl = o.exec ?? ((args) => pactl(args, o.signal));
  let outs: string, srcs: string;
  try {
    [outs, srcs] = await Promise.all([exec(['list', 'source-outputs']), exec(['list', 'short', 'sources'])]);
  } catch {
    return { available: false, active: false };
  }
  const app = callApp(parseSourceOutputs(outs), monitorSources(srcs), o.apps);
  return track(o.state ?? tracker, app, o.now, graceFor(o.intervalMs ?? INTERVAL));
}

export function demoCall(now: number): CallState {
  return { available: true, active: true, app: 'Teams', since: now - 12 * 60_000 };
}

export const active = defineSource({
  id: 'active',
  name: { en: 'Video call', es: 'Videollamada', 'zh-Hant': '視訊通話', 'zh-Hans': '视频通话' },
  description: {
    en: 'Whether you are on a call: an app (browser, Teams, Zoom…) holding the microphone open, even muted. Linux with PulseAudio or PipeWire.',
    es: 'Si estás en una llamada: una aplicación (navegador, Teams, Zoom…) con el micrófono abierto, aunque esté silenciado. Linux con PulseAudio o PipeWire.',
    'zh-Hant': '你是否正在通話：有應用程式（瀏覽器、Teams、Zoom…）開著麥克風，即使已靜音。適用於使用 PulseAudio 或 PipeWire 的 Linux。',
    'zh-Hans': '你是否正在通话：有应用（浏览器、Teams、Zoom…）占用着麦克风，即使已静音。适用于使用 PulseAudio 或 PipeWire 的 Linux。',
  },
  options: t.object({
    apps: t.list(t.string({ placeholder: 'firefox' }), {
      default: CALL_BINARIES,
      label: { en: 'Apps that count', es: 'Aplicaciones que cuentan', 'zh-Hant': '計入的應用程式', 'zh-Hans': '计入的应用' },
      help: { en: 'Process names. Empty = any app recording from a microphone.', es: 'Nombres de proceso. Vacío = cualquier aplicación que grabe de un micrófono.', 'zh-Hant': '處理程序名稱。留空 = 任何從麥克風錄音的應用程式。', 'zh-Hans': '进程名称。留空 = 任何从麦克风录音的应用。' },
    }),
  }),
  intervalMs: INTERVAL,
  // Two pactl calls that give up after 3 s each.
  timeoutMs: 10_000,
  read: ({ options, now, intervalMs, signal }) => readCall({ apps: options.apps, now, intervalMs, signal }),
  demo: ({ now }) => demoCall(now),
});
