# Signal Garden

Collect promising ideas, tag their signal strength, and decide what to nurture.

![Signal Garden preview](docs/preview.svg)

Signal Garden is a small local-first planning tool for solo builders, operators, and creative teams who want a cleaner way to manage signals. Add items, score the signal, track the friction, and keep the strongest opportunities visible without needing a backend or build step.

## Features

- Local-first persistence with `localStorage`
- Search and filter controls
- Ranked list sorted by signal minus friction
- Inline editor for title, notes, type, status, score, and effort
- Import/export JSON backups
- Re-seed action for resetting the sample board
- Keyboard shortcuts: `N` for new, `/` for search
- No build tooling, just open in a browser

## Quick start

```bash
git clone https://github.com/<you>/signal-garden.git
cd signal-garden
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Data shape

```json
{
  "boardTitle": "Idea signal board",
  "items": [
    {
      "title": "Law student citation coach",
      "category": "Audience",
      "state": "Watching",
      "score": 7,
      "effort": 4
    }
  ]
}
```

## Privacy

Everything stays in your browser unless you export a JSON backup.

## License

MIT
