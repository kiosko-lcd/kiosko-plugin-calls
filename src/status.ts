/**
 * The on-air light: "On a call · 12 min" in the alert colour while an app
 * holds the microphone; dark the rest of the time (darkness is the normal
 * state of the semaphore), or out of the rotation with `onlyDuringCall`.
 */
import { defineWidget, t, type Localized } from '@kiosko/sdk';
import type { CallState } from './active.ts';
import { demoCall } from './active.ts';

const SOURCE = 'calls/active';

/** "12 min", "1 h 05". */
export function elapsed(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

/** The line to paint, or null for a dark tile. */
export function statusLine(call: CallState | undefined, now: number, showApp: boolean): { text: Localized; sub?: string } | null {
  if (!call) return null;
  if (!call.available) return { text: { en: 'Calls unavailable', es: 'Llamadas no disponibles' } };
  if (!call.active) return null;
  const dur = call.since !== undefined ? ` · ${elapsed(now - call.since)}` : '';
  return { text: { en: `On a call${dur}`, es: `En llamada${dur}` }, ...(showApp && call.app ? { sub: call.app } : {}) };
}

const callOf = (sources: Record<string, unknown>) => sources[SOURCE] as CallState | undefined;

export const status = defineWidget({
  id: 'status',
  name: { en: 'On a call', es: 'En llamada' },
  description: {
    en: 'An on-air light: lit while an app holds the microphone (even muted), with how long the call has lasted. Dark otherwise.',
    es: 'Un piloto de «en el aire»: encendido mientras una aplicación tiene el micrófono abierto (aunque esté silenciado), con lo que dura la llamada. Apagado el resto del tiempo.',
  },
  icon: 'phone',
  category: 'system',
  tags: ['call', 'microphone', 'teams', 'meeting'],
  size: { min: { w: 140, h: 40 }, preferred: { w: 320, h: 90 } },
  sources: [SOURCE],
  options: t.object({
    showApp: t.boolean({ default: true, label: { en: 'Show the app', es: 'Mostrar la aplicación' }, help: { en: 'Which app holds the mic (Teams, Chrome…).', es: 'Qué aplicación tiene el micro (Teams, Chrome…).' } }),
    onlyDuringCall: t.boolean({ label: { en: 'Only during a call', es: 'Sólo durante una llamada' }, help: { en: 'Skipped in its cell rotation when there is no call.', es: 'Sale del turno de su celda cuando no hay llamada.' } }),
    takeOver: t.boolean({ label: { en: 'Take the cell over during a call', es: 'Quedarse la celda durante la llamada' }, help: { en: 'Marks the widget urgent while the call lasts, so it stays on screen.', es: 'Marca el widget como urgente mientras dura la llamada, para que se quede en pantalla.' } }),
  }),
  redraw: ({ sources }) => (callOf(sources)?.active ? 'minute' : 'never'),
  visible: ({ options, sources }) => !options.onlyDuringCall || Boolean(callOf(sources)?.active),
  urgent: ({ options, sources }) => options.takeOver && Boolean(callOf(sources)?.active),
  idle: ({ sources }) => !callOf(sources)?.active,
  demo: ({ now }) => ({ sources: { [SOURCE]: demoCall(now) } }),
  render(g, { options, sources, now, box, theme, kit, t: tr }) {
    const line = statusLine(callOf(sources), now, options.showApp);
    if (!line) return;
    const { colors, fonts } = theme;
    const lit = Boolean(callOf(sources)?.active);
    const col = lit ? colors.alert : colors.inkFaint;
    const size = Math.round(Math.max(11, Math.min(box.h * (line.sub ? 0.42 : 0.6), box.w / 9)));
    const r = size * 0.28;
    const baseY = box.y + (line.sub ? box.h * 0.5 : (box.h + size * 0.7) / 2);
    if (lit) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(box.x + r, baseY - size * 0.35, r, 0, Math.PI * 2);
      g.fill();
    }
    const x = box.x + (lit ? r * 2 + size * 0.35 : 0);
    const opts = { size, family: fonts.sans };
    kit.drawTracked(g, kit.truncate(g, tr(line.text), box.x + box.w - x, opts), x, baseY, { ...opts, color: col });
    if (line.sub) {
      const ss = Math.round(size * 0.6);
      kit.drawTracked(g, kit.truncate(g, line.sub, box.x + box.w - x, { size: ss, family: fonts.sans }), x, baseY + ss * 1.4, { size: ss, family: fonts.sans, color: colors.inkDim });
    }
  },
});
