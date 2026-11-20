/**
 * Calls: are you on a video call right now? A shared `active` source that
 * watches microphone captures in PulseAudio/PipeWire, and an on-air light.
 */
import { definePlugin } from '@kiosko/sdk';
import { active } from './active.ts';
import { status } from './status.ts';

export { active, status };
export type { CallState } from './active.ts';

export default definePlugin({
  id: 'calls',
  name: { en: 'Calls', es: 'Llamadas', 'zh-Hant': '通話', 'zh-Hans': '通话' },
  version: '0.2.1',
  sdk: '^0.2.0',
  permissions: { exec: ['pactl'], devices: ['audio'] },
  description: { en: 'Detects video calls by the open microphone, even muted, and shows an on-air light.', es: 'Detecta las videollamadas por el micrófono abierto, aunque esté silenciado, y muestra un piloto de «en el aire».', 'zh-Hant': '依麥克風是否開啟（即使已靜音）偵測視訊通話，並顯示「通話中」指示燈。', 'zh-Hans': '根据麦克风是否打开（即使已静音）检测视频通话，并显示“通话中”指示灯。' },
  author: 'Kiosko',
  license: 'MIT',
  icon: 'phone',
  widgets: [status],
  sources: [active],
});
