# kiosko-plugin-calls

Detects video calls by the open microphone, even muted, and shows an on-air light.

A plugin for [Kiosko](https://github.com/kiosko-lcd/kiosko), the widget mosaic for small USB LCD panels.

![On a call](docs/status.png)

## Install

In Kiosko, **Plugins → Install from npm** → `kiosko-plugin-calls`, then restart Kiosko. Or from a terminal:

```sh
npm install --prefix ~/.config/kiosko/plugins kiosko-plugin-calls
```

(macOS: `~/Library/Application Support/Kiosko/plugins`, Windows: `%APPDATA%\Kiosko\plugins`.)

## Requirements

- Linux with PulseAudio or PipeWire (`pipewire-pulse`) and `pactl`. Elsewhere the source reports `available: false` and the widget says "Calls unavailable".

## Widgets

### On a call — `calls/status`

An on-air light: lit while an app holds the microphone (even muted), with how long the call has lasted. Dark otherwise.

![On a call](docs/status.png)

Uses: `calls/active`.

| Option | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | Text. Empty = "On a call". "ON AIR", "Do not disturb"… for whoever walks in. |
| `showApp` | boolean | `true` | Show the app. Which app holds the mic (Teams, Chrome…). |
| `onlyDuringCall` | boolean | `false` | Only during a call. Skipped in its cell rotation when there is no call. |

## Data sources

### Video call — `calls/active`

Whether you are on a call: an app (browser, Teams, Zoom…) holding the microphone open, even muted. Linux with PulseAudio or PipeWire. Read every 15 s while a widget uses it. Options are set once in Kiosko → Settings → Data sources.

| Option | Type | Default | |
|---|---|---|---|
| `apps` | list | … | Apps that count. Process names. Empty = any app recording from a microphone. |

## Development

```sh
npm install
npm test          # node:test
npm run check     # TypeScript
npm run build     # dist/index.js, what Kiosko loads
```

To try it in a running Kiosko without publishing: `kiosko plugins link .` and restart Kiosko.

Working on Kiosko and its plugins together: clone them side by side
(`kiosko/` and `kiosko-plugins/kiosko-plugin-calls/`) and run `npm install` in
`kiosko/`; its workspaces link every plugin found in `../kiosko-plugins`.

## License

MIT
