# Tailwind Agent Instructions

TailwindCSS v4 is currently used. When updating anyting tailwind, make sure to use the classes valid for that version. Whenever Tailwind integration or upgrades are needed, check the official Tailwind documentation first:
- https://tailwindcss.com/docs/installation/using-postcss

Use the official PostCSS installation flow:
- Install `tailwindcss`, `@tailwindcss/postcss`, and `postcss`
- Create or update `postcss.config.mjs` to include:
  - `@tailwindcss/postcss()`
  - `autoprefixer()`
- In the app CSS entry point, import Tailwind via:
  - `@import "tailwindcss";`
- If custom scanning is needed, use `tailwind.config.cjs` with:
  - `content: ['./src/**/*.{html,js}']`

Ensure the build pipeline:
- loads the PostCSS config file
- processes the CSS through Tailwind and Autoprefixer
- outputs a final built CSS asset referenced by HTML

Remove and do not use legacy Tailwind v3 remnants:
- `https://cdn.tailwindcss.com` script tags
- `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` directives in source CSS
- old `tailwind.config.js` files if present

Verify generated CSS contains the expected utilities, for example:
- `.border-indigo-300`
- `.hover\:border-indigo-300`
- `.focus\:border-indigo-500`
- `.focus\:ring-indigo-500`

Write the modern versions of JavaScript, CSS and HTML.

When testing visually, use a different port for serving, because I often already run a dev on http://localhost:4173. If you can use a different port for your visual testing, and leave my instance running, that would be best. After finishing your tests, stop the server and close that terminal, otherwise you'll leave many terminals and have blocked ports.
