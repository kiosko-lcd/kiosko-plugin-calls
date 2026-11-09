/**
 * Call detection: while a video call lasts, the browser (or the Teams
 * client) keeps a microphone capture open, and PulseAudio/PipeWire list it
 * in `pactl list source-outputs`, even when the mic is muted in the call.
 * Ported from aimonitor's calls.ts.
 */

/** Programs that count by default: browsers and Teams clients. */
export const CALL_BINARIES = ['chrome', 'google-chrome', 'msedge', 'microsoft-edge', 'chromium', 'brave', 'firefox', 'teams', 'teams-for-linux', 'zoom', 'slack', 'discord', 'skypeforlinux'];

export interface SourceOutput {
  source: number;
  props: Record<string, string>;
}

/** `LC_ALL=C pactl list source-outputs` → one entry per capture stream. */
export function parseSourceOutputs(text: string): SourceOutput[] {
  const out: SourceOutput[] = [];
  let cur: SourceOutput | null = null;
  for (const line of text.split('\n')) {
    if (/^Source Output #\d+/.test(line)) {
      cur = { source: -1, props: {} };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const src = /^\s+Source: (\d+)/.exec(line);
    if (src) cur.source = Number(src[1]);
    const prop = /^\s+([\w.-]+) = "(.*)"$/.exec(line);
    if (prop) cur.props[prop[1]!] = prop[2]!;
  }
  return out;
}

/** `pactl list short sources` → indexes of the monitors (sound going out, not a mic). */
export function monitorSources(text: string): Set<number> {
  const out = new Set<number>();
  for (const line of text.split('\n')) {
    const [idx, name] = line.split('\t');
    if (idx && name?.endsWith('.monitor')) out.add(Number(idx));
  }
  return out;
}

const PRETTY: Record<string, string> = {
  chrome: 'Chrome', 'google-chrome': 'Chrome', chromium: 'Chromium', msedge: 'Edge', 'microsoft-edge': 'Edge', brave: 'Brave', firefox: 'Firefox',
  teams: 'Teams', 'teams-for-linux': 'Teams', zoom: 'Zoom', slack: 'Slack', discord: 'Discord', skypeforlinux: 'Skype',
};

/**
 * The app holding a microphone, or null. `binaries` empty = any app counts.
 */
export function callApp(outputs: SourceOutput[], monitors: Set<number>, binaries: string[] = CALL_BINARIES): string | null {
  const list = binaries.map((b) => b.trim().toLowerCase()).filter(Boolean);
  for (const o of outputs) {
    if (monitors.has(o.source)) continue;
    const bin = (o.props['application.process.binary'] ?? '').toLowerCase();
    const app = (o.props['application.name'] ?? '').toLowerCase();
    const hit = list.length ? list.find((b) => bin === b || bin.startsWith(`${b}-`) || app.includes(b.replace(/-/g, ' '))) : bin || app || 'app';
    if (!hit) continue;
    const key = list.length ? hit : bin;
    return PRETTY[key] ?? PRETTY[bin] ?? (o.props['application.name'] || bin || hit);
  }
  return null;
}
