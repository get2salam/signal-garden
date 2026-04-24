# Signal Garden

Collect promising ideas, tag their signal strength, and decide what to nurture.

![Signal Garden preview](docs/preview.svg)

Signal Garden is a local-first workspace for founders, operators, and solo builders who want a cleaner way to manage signals. It keeps confidence, source, next test, and review timing visible so the right things move forward with less drift.

## What it does

- ranks signals by leverage, confidence, timing, and friction
- tracks **source**, **next test**, **review date**, and **confidence** for each signal
- highlights the best current bet, the next review slot, and the strongest signal on the board
- renders a dedicated queue plus a category mix snapshot beneath the main board
- saves locally in the browser with JSON import/export backups
- quick action: **Schedule next test**
- quick action: **Nurture signal**
- quick action: **Copy next test**

## Why it feels different

Signal Garden is not just a generic list. It is shaped around the real workflow behind signals, so the board helps you decide what matters next instead of simply storing records.

## Quick start

```bash
git clone https://github.com/get2salam/signal-garden.git
cd signal-garden
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Keyboard shortcuts

- `N` creates a new signal
- `/` focuses the search box

## Privacy

Everything stays in your browser unless you export a JSON backup.

## License

MIT
