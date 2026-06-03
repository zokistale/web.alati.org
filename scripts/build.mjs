import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

function toAssetPath(filename) {
	return `assets/${filename}`;
}

function createContentHash(content) {
	return createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function skipQuotedString(source, startIndex, quote) {
	let index = startIndex + 1;

	while (index < source.length) {
		if (source[index] === '\\') {
			index += 2;
			continue;
		}

		if (source[index] === quote) {
			return index + 1;
		}

		index += 1;
	}

	throw new Error(`Unterminated string literal starting at index ${startIndex}.`);
}

function skipLineComment(source, startIndex) {
	let index = startIndex + 2;

	while (index < source.length && source[index] !== '\n') {
		index += 1;
	}

	return index;
}

function skipBlockComment(source, startIndex) {
	let index = startIndex + 2;

	while (index < source.length) {
		if (source[index] === '*' && source[index + 1] === '/') {
			return index + 2;
		}

		index += 1;
	}

	throw new Error(`Unterminated block comment starting at index ${startIndex}.`);
}

function minifyHtmlFragment(fragment, options = {}) {
	const { preserveLeadingSpace = false, preserveTrailingSpace = false } = options;
	const hadLeadingSpace = /^\s/.test(fragment);
	const hadTrailingSpace = /\s$/.test(fragment);
	let compact = fragment
		.replace(/[\t\r\n]+/g, ' ')
		.replace(/>\s+</g, '><')
		.replace(/\s{2,}/g, ' ')
		.trim();

	if (!compact) {
		return '';
	}

	if (preserveLeadingSpace && hadLeadingSpace && !compact.startsWith('<') && !compact.startsWith('>')) {
		compact = ` ${compact}`;
	}

	if (preserveTrailingSpace && hadTrailingSpace && !compact.endsWith('>') && !compact.endsWith('<')) {
		compact = `${compact} `;
	}

	return compact;
}

function parseTemplateExpression(source, startIndex) {
	let index = startIndex;
	let depth = 1;
	let result = '';

	while (index < source.length) {
		const current = source[index];
		const next = source[index + 1];

		if (current === '\'' || current === '"') {
			const end = skipQuotedString(source, index, current);
			result += source.slice(index, end);
			index = end;
			continue;
		}

		if (current === '/' && next === '/') {
			const end = skipLineComment(source, index);
			result += source.slice(index, end);
			index = end;
			continue;
		}

		if (current === '/' && next === '*') {
			const end = skipBlockComment(source, index);
			result += source.slice(index, end);
			index = end;
			continue;
		}

		if (current === '`') {
			const template = parseTemplateLiteral(source, index);
			result += template.text;
			index = template.end;
			continue;
		}

		if (current === '{') {
			depth += 1;
			result += current;
			index += 1;
			continue;
		}

		if (current === '}') {
			depth -= 1;

			if (depth === 0) {
				return {
					text: result,
					end: index + 1
				};
			}

			result += current;
			index += 1;
			continue;
		}

		result += current;
		index += 1;
	}

	throw new Error(`Unterminated template expression starting at index ${startIndex}.`);
}

function buildTemplateLiteral(parts, isHtml) {
	let result = '`';

	for (const [index, part] of parts.entries()) {
		if (part.type === 'text') {
			const previousPart = parts[index - 1] ?? null;
			const nextPart = parts[index + 1] ?? null;
			result += isHtml
				? minifyHtmlFragment(part.value, {
					preserveLeadingSpace: previousPart?.type === 'expression',
					preserveTrailingSpace: nextPart?.type === 'expression'
				})
				: part.value;
			continue;
		}

		result += '${';
		result += part.value;
		result += '}';
	}

	result += '`';

	return result;
}

function parseTemplateLiteral(source, startIndex) {
	let index = startIndex + 1;
	let currentText = '';
	const parts = [];

	while (index < source.length) {
		const current = source[index];

		if (current === '\\') {
			currentText += source.slice(index, index + 2);
			index += 2;
			continue;
		}

		if (current === '`') {
			parts.push({ type: 'text', value: currentText });
			const staticText = parts
				.filter((part) => part.type === 'text')
				.map((part) => part.value)
				.join('');
			const isHtml = /<\s*[a-z!/]/i.test(staticText);

			return {
				text: buildTemplateLiteral(parts, isHtml),
				end: index + 1
			};
		}

		if (current === '$' && source[index + 1] === '{') {
			parts.push({ type: 'text', value: currentText });
			currentText = '';
			const expression = parseTemplateExpression(source, index + 2);
			parts.push({ type: 'expression', value: expression.text });
			index = expression.end;
			continue;
		}

		currentText += current;
		index += 1;
	}

	throw new Error(`Unterminated template literal starting at index ${startIndex}.`);
}

function minifyHtmlTemplateLiterals(source) {
	let index = 0;
	let result = '';

	while (index < source.length) {
		const current = source[index];
		const next = source[index + 1];

		if (current === '\'' || current === '"') {
			const end = skipQuotedString(source, index, current);
			result += source.slice(index, end);
			index = end;
			continue;
		}

		if (current === '/' && next === '/') {
			const end = skipLineComment(source, index);
			result += source.slice(index, end);
			index = end;
			continue;
		}

		if (current === '/' && next === '*') {
			const end = skipBlockComment(source, index);
			result += source.slice(index, end);
			index = end;
			continue;
		}

		if (current === '`') {
			const template = parseTemplateLiteral(source, index);
			result += template.text;
			index = template.end;
			continue;
		}

		result += current;
		index += 1;
	}

	return result;
}

async function buildHashedAsset({ entryPoint, outbaseName, extension, options = {} }) {
	const sourcePath = path.join(srcDir, entryPoint);
	const buildInput = extension === 'js'
		? {
			stdin: {
				contents: minifyHtmlTemplateLiterals(await readFile(sourcePath, 'utf8')),
				loader: 'js',
				resolveDir: srcDir,
				sourcefile: sourcePath
			}
		}
		: {
			entryPoints: [sourcePath]
		};

	const result = await build({
		...buildInput,
		outfile: path.join(rootDir, `${outbaseName}.${extension}`),
		bundle: true,
		minify: true,
		write: false,
		legalComments: 'none',
		...options
	});

	const outputFile = result.outputFiles.find((file) => file.path.endsWith(`.${extension}`));

	if (!outputFile) {
		throw new Error(`No .${extension} output was generated for ${entryPoint}.`);
	}

	const hash = createContentHash(outputFile.contents);
	const fileName = `${outbaseName}.${hash}.${extension}`;
	const outFile = path.join(assetsDir, fileName);

	await writeFile(outFile, outputFile.contents);

	return fileName;
}

function rewriteHtmlAssetRefs(html, assets) {
	return html
		.replace(/src=(['"])app-navigation\.js\1/g, `src="${assets.appNavigation}"`)
		.replace(/href=(['"])style\.css\1/g, `href="${assets.style}"`)
		.replace(/href=(['"])favicon\.ico\1/g, 'href="favicon.ico"');
}

async function copyHtmlFiles(assets) {
	const entries = await readdir(srcDir, { withFileTypes: true });
	const htmlFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.html'));

	for (const entry of htmlFiles) {
		const sourcePath = path.join(srcDir, entry.name);
		const outputPath = path.join(distDir, entry.name);
		const html = await readFile(sourcePath, 'utf8');
		const rewritten = rewriteHtmlAssetRefs(html, {
			appNavigation: toAssetPath(assets.appNavigation),
			style: toAssetPath(assets.style)
		});

		await writeFile(outputPath, rewritten, 'utf8');
	}
}

async function copyFolder(source, destination) {
	await mkdir(destination, { recursive: true });
	const entries = await readdir(source, { withFileTypes: true });

	for (const entry of entries) {
		const sourcePath = path.join(source, entry.name);
		const destinationPath = path.join(destination, entry.name);

		if (entry.isDirectory()) {
			await copyFolder(sourcePath, destinationPath);
			continue;
		}

		if (entry.isFile()) {
			await copyFile(sourcePath, destinationPath);
		}
	}
}

async function main() {
	await rm(distDir, { recursive: true, force: true });
	await mkdir(assetsDir, { recursive: true });

	const [appNavigationFile, styleFile] = await Promise.all([
		buildHashedAsset({
			entryPoint: 'app-navigation.js',
			outbaseName: 'app-navigation',
			extension: 'js',
			options: {
				platform: 'browser',
				format: 'iife',
				target: ['es2018']
			}
		}),
		buildHashedAsset({
			entryPoint: 'style.css',
			outbaseName: 'style',
			extension: 'css'
		})
	]);

	await Promise.all([
		copyHtmlFiles({
			appNavigation: appNavigationFile,
			style: styleFile
		}),
		copyFile(path.join(srcDir, 'favicon.ico'), path.join(distDir, 'favicon.ico'))
	]);

	await copyFolder(path.join(srcDir, 'data'), path.join(distDir, 'data'));

	console.log(`Built dist with ${appNavigationFile} and ${styleFile}`);
	console.log(`HTML files were copied from ${path.relative(rootDir, srcDir)} to ${path.relative(rootDir, distDir)}`);
	console.log('Copied favicon.ico to dist');
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});