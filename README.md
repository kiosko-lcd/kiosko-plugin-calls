# kiosko-plugin-calls

Are you on a video call? Detects an app holding the microphone open (even muted in Teams) and shows an on-air light.

A plugin for [Kiosko](https://github.com/kiosko-lcd/kiosko), the widget mosaic for small USB LCD panels.

## Install

In Kiosko, **Plugins → Install from npm** → `kiosko-plugin-calls`, then restart Kiosko.

## Requirements

- Linux with PulseAudio or PipeWire (`pipewire-pulse`) and `pactl`. Elsewhere the source reports `available: false` and the widget says "Calls unavailable".

## Widgets

### On a call — `calls/status`

"On a call · 12 min" in the alert colour, with the app below, while a call lasts. Dark otherwise.

| Option | Type | Default | |
|---|---|---|---|
| `showApp` | boolean | `true` | Show which app holds the mic. |
| `onlyDuringCall` | boolean | `false` | Skipped in its cell rotation when there is no call. |
| `takeOver` | boolean | `false` | Urgent during a call, so it keeps its cell. |

The widget is `idle` when there is no call, so a page with `sleepWhenIdle` can go black.

## Data sources

### Video call — `calls/active`

`{ available, active, app?, since? }`, read every 15 s from `pactl list source-outputs` (monitor sources excluded).

| Option | Type | Default | |
|---|---|---|---|
| `apps` | list | browsers, Teams, Zoom, Slack, Discord, Skype | Process names that count. Empty = any app recording from a mic. |
