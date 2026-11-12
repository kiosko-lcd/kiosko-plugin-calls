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
  name: { en: 'Calls', es: 'Llamadas' },
  version: '0.2.0',
  description: { en: 'Detects video calls by the open microphone, even muted, and shows an on-air light.', es: 'Detecta las videollamadas por el micrófono abierto, aunque esté silenciado, y muestra un piloto de «en el aire».' },
  author: 'Kiosko',
  license: 'MIT',
  icon: 'phone',
  widgets: [status],
  sources: [active],
});
