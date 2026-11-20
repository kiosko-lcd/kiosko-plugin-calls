/**
 * The on-air light: "On a call · 12 min" in the alert colour while an app
 * holds the microphone; dark the rest of the time (darkness is the normal
 * state of the semaphore), or out of the rotation with `onlyDuringCall`.
 */
import { defineWidget, t, type Formatters, type Localized } from '@kiosko/sdk';
import type { CallState } from './active.ts';
import { demoCall } from './active.ts';

const SOURCE = 'calls/active';


/**
 * The line to paint, or null for a dark tile: "On a call · 12 min" (or the
 * user's `label`), with the app under it when `showApp`.
 */
export function statusLine(call: CallState | undefined, now: number, o: { showApp: boolean; label: string }, fmt: Pick<Formatters, 'duration'>): { text: Localized; sub?: string } | null {
  if (!call) return null;
  if (!call.available) return { text: { en: 'Calls unavailable', es: 'Llamadas no disponibles', de: 'Anrufe nicht verfügbar', 'zh-Hant': '無法取得通話狀態', 'zh-Hans': '无法获取通话状态' } };
  if (!call.active) return null;
  const dur = call.since !== undefined ? ` · ${fmt.duration(now - call.since)}` : '';
  const label = o.label.trim();
  const text: Localized = label ? `${label}${dur}` : { en: `On a call${dur}`, es: `En llamada${dur}`, de: `Im Gespräch${dur}`, 'zh-Hant': `通話中${dur}`, 'zh-Hans': `通话中${dur}` };
  return { text, ...(o.showApp && call.app ? { sub: call.app } : {}) };
}

const callOf = (sources: Record<string, unknown>) => sources[SOURCE] as CallState | undefined;

export const status = defineWidget({
  id: 'status',
  name: { en: 'On a call', es: 'En llamada', de: 'Im Gespräch', 'zh-Hant': '通話中', 'zh-Hans': '通话中' },
  description: {
    en: 'An on-air light: lit while an app holds the microphone (even muted), with how long the call has lasted. Dark otherwise.',
    es: 'Un piloto de «en el aire»: encendido mientras una aplicación tiene el micrófono abierto (aunque esté silenciado), con lo que dura la llamada. Apagado el resto del tiempo.',
    de: 'Ein „On Air“-Licht: leuchtet, solange eine App das Mikrofon belegt (auch stummgeschaltet), und zeigt, wie lange das Gespräch schon dauert. Sonst dunkel.',
    'zh-Hant': '「通話中」指示燈：有應用程式佔用麥克風時亮起（即使已靜音），並顯示通話已持續多久。其他時候熄滅。',
    'zh-Hans': '“通话中”指示灯：有应用占用麦克风时亮起（即使已静音），并显示通话已持续多久。其他时候熄灭。',
  },
  icon: 'phone',
  category: 'system',
  tags: ['call', 'microphone', 'teams', 'meeting'],
  size: { min: { w: 140, h: 40 }, preferred: { w: 320, h: 90 } },
  sources: [SOURCE],
  options: t.object({
    label: t.string({ placeholder: 'ON AIR', maxLength: 40, label: { en: 'Text', es: 'Texto', de: 'Text', 'zh-Hant': '文字', 'zh-Hans': '文本' }, help: { en: 'Empty = "On a call". "ON AIR", "Do not disturb"… for whoever walks in.', es: 'Vacío = «En llamada». «ON AIR», «No molestar»… para quien entre en el despacho.', de: 'Leer = „Im Gespräch“. „ON AIR“, „Bitte nicht stören“… für alle, die hereinkommen.', 'zh-Hant': '留空 = 「通話中」。也可改成「ON AIR」、「請勿打擾」…，給走進來的人看。', 'zh-Hans': '留空 = “通话中”。也可改成“ON AIR”“请勿打扰”…，给进门的人看。' } }),
    showApp: t.boolean({ default: true, label: { en: 'Show the app', es: 'Mostrar la aplicación', de: 'App anzeigen', 'zh-Hant': '顯示應用程式', 'zh-Hans': '显示应用' }, help: { en: 'Which app holds the mic (Teams, Chrome…).', es: 'Qué aplicación tiene el micro (Teams, Chrome…).', de: 'Welche App das Mikrofon belegt (Teams, Chrome…).', 'zh-Hant': '哪個應用程式佔用麥克風（Teams、Chrome…）。', 'zh-Hans': '哪个应用占用麦克风（Teams、Chrome…）。' } }),
    onlyDuringCall: t.boolean({ label: { en: 'Only during a call', es: 'Sólo durante una llamada', de: 'Nur während eines Gesprächs', 'zh-Hant': '僅在通話時', 'zh-Hans': '仅在通话时' }, help: { en: 'Skipped in its cell rotation when there is no call.', es: 'Sale del turno de su celda cuando no hay llamada.', de: 'Wird in der Rotation seiner Zelle übersprungen, solange kein Gespräch läuft.', 'zh-Hant': '沒有通話時，在格位輪播中略過。', 'zh-Hans': '没有通话时，在格子轮播中跳过。' } }),
  }),
  redraw: ({ sources }) => (callOf(sources)?.active ? 'minute' : 'never'),
  visible: ({ options, sources }) => !options.onlyDuringCall || Boolean(callOf(sources)?.active),
  // Urgent for the whole call; keeping the tile for it is the user's choice (off by default).
  urgent: ({ sources }) => Boolean(callOf(sources)?.active),
  takeOver: false,
  idle: ({ sources }) => !callOf(sources)?.active,
  demo: ({ now }) => ({ sources: { [SOURCE]: demoCall(now) } }),
  render(g, { options, sources, now, box, theme, kit, t: tr, fmt }) {
    const line = statusLine(callOf(sources), now, options, fmt);
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
