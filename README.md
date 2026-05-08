# web.alati.org

This website offers a collection of handy tools designed for randomly generating realistic names and email addresses. Whether you're a developer needing placeholder data for testing, a writer looking for character names, or simply want to create temporary emails for privacy, these generators provide quick, customizable results to choose from – all instantly and completely free.

## Build

Install dependencies and build the static output into `dist`:

```bash
npm install
npm run build
```

The build copies every HTML file from `src`, emits hashed versions of the shared local CSS and JavaScript into `dist/assets`, rewrites the HTML files to point at those hashed assets, and copies `favicon.ico` into `dist`.

## Email Generator

Generate unique placeholder email addresses for testing or development.

## Name Generator

Generate unique placeholder full names for mock data and development.

## String Generator

Generate cryptographically secure placeholder strings.

## Text Transformer

Convert any text into professional titles or URL-friendly slugs for files and web pages.