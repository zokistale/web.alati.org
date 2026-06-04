# web.alati.org

This website offers a collection of useful browser-based tools for generating placeholder data, manipulating text, and browsing legacy Macedonian Cyrillic fonts. Whether you're a developer building mock data, a designer testing form layouts, or a writer searching for names and email patterns, the site gives you fast, client-side utilities with no backend required.

## Pages

- **Home** — the Web Alati apps landing page.
- **Email Generator** — generate random placeholder email addresses for testing, seed data, or temporary use.
- **Name Generator** — generate realistic placeholder full names for mock data and development.
- **String Generator** — create cryptographically secure random strings of configurable length and character sets.
- **Text Transformer** — transform text into title-form headings, URL slugs, and cleaned-up formats.
- **Macedonian Fonts** — browse historic Macedonian Cyrillic fonts with preview and download support.
- **EN-MK Converter** — convert between Latin and Macedonian Cyrillic alphabets, including legacy font-style text.

## Build

Install dependencies and build the static output into `dist`:

```bash
npm install
npm run build
```

The build copies every HTML file from `src`, emits hashed versions of the shared local CSS and JavaScript into `dist/assets`, rewrites the HTML files to point at those hashed assets, and copies `favicon.ico` into `dist`.

## Development

Run the dev server with the existing `npm run dev` command to rebuild on file changes and serve the `dist` output locally.

## Agents

For future Tailwind workflow or PostCSS updates, see `Agents.md` for the repo-specific instructions.
