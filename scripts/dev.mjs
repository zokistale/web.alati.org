import http from 'node:http';
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const srcDir = path.join(rootDir, 'src');
const preferredPort = Number(process.env.PORT || 4173);

let clients = [];
let buildQueued = false;
let building = false;

const log = (...args) => console.log('[dev]', ...args);

const runBuild = () => new Promise((resolve, reject) => {
	const child = spawn(process.execPath, ['./scripts/build.mjs'], {
		cwd: rootDir,
		stdio: 'inherit'
	});

	child.on('exit', (code) => {
		if (code === 0) {
			resolve();
			return;
		}

		reject(new Error(`Build process exited with code ${code}`));
	});

	child.on('error', reject);
});

const scheduleBuild = () => {
	if (buildQueued) {
		return;
	}

	buildQueued = true;
	setTimeout(() => {
		buildQueued = false;
		performBuild();
	}, 100);
};

const performBuild = async () => {
	if (building) {
		buildQueued = true;
		return;
	}

	building = true;

	try {
		log('Building...');
		await runBuild();
		log('Build complete.');
		notifyClients();
	} catch (error) {
		console.error('[dev] Build failed:', error.message);
	} finally {
		building = false;
		if (buildQueued) {
			buildQueued = false;
			performBuild();
		}
	}
};

const notifyClients = () => {
	for (const client of clients) {
		client.write('data: reload\n\n');
	}
};

const ensureDistExists = async () => {
	try {
		await access(distDir);
	} catch {
		await mkdir(distDir, { recursive: true });
	}
};

const serveLiveReloadScript = (res) => {
	res.writeHead(200, {
		'Content-Type': 'application/javascript',
		'Cache-Control': 'no-cache'
	});

	res.end(`const source = new EventSource('/events');\nsource.addEventListener('message', () => location.reload());\nsource.addEventListener('error', () => console.warn('Live reload disconnected'));\n`);
};

const send404 = (res) => {
	res.writeHead(404, { 'Content-Type': 'text/plain' });
	res.end('Not found');
};

const mimeTypes = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'application/javascript',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.ttf': 'font/ttf',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2'
};

const serveStatic = async (req, res) => {
	const requestUrl = new URL(req.url, `http://${req.headers.host}`);
	let pathname = decodeURIComponent(requestUrl.pathname);

	if (pathname === '/') {
		pathname = '/index.html';
	}

	if (pathname === '/events') {
		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive'
		});
		res.write('retry: 10000\n\n');

		clients.push(res);
		req.on('close', () => {
			clients = clients.filter((client) => client !== res);
		});
		return;
	}

	if (pathname === '/livereload.js') {
		serveLiveReloadScript(res);
		return;
	}

	if (pathname === '/api/exchange-rates') {
		console.log('[dev] proxying /api/exchange-rates to NBM');
		try {
			const today = new Date();
			const dateString = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
			const url = `https://www.nbrm.mk/KLServiceNOV/EN/GetExchangeRates?StartDate=${dateString}&EndDate=${dateString}`;
			const upstreamResponse = await fetch(url, { headers: { Accept: 'application/xml' } });

			if (!upstreamResponse.ok) {
				const errorText = await upstreamResponse.text().catch(() => '');
				res.writeHead(upstreamResponse.status, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' });
				res.end(errorText || `Upstream request failed with status ${upstreamResponse.status}`);
				return;
			}

			const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
			res.writeHead(200, {
				'Content-Type': 'application/xml',
				'Cache-Control': 'no-cache'
			});
			res.end(buffer);
		} catch (error) {
			res.writeHead(502, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' });
			res.end(`Exchange rate proxy error: ${error.message}`);
		}
		return;
	}

	const filePath = path.join(distDir, pathname);

	try {
		const content = await readFile(filePath);
		const ext = path.extname(filePath).toLowerCase();
		const headers = {
			'Content-Type': mimeTypes[ext] || 'application/octet-stream',
			'Cache-Control': 'no-cache'
		};

		if (ext === '.html') {
			let html = content.toString('utf8');
			if (!html.includes('src="/livereload.js"')) {
				html = html.replace(/<\/body>/i, '<script src="/livereload.js"></script></body>');
			}
			res.writeHead(200, headers);
			res.end(html);
			return;
		}

		res.writeHead(200, headers);
		res.end(content);
	} catch {
		send404(res);
	}
};

const findAvailablePort = (startPort) => new Promise((resolve, reject) => {
	const tryPort = (port) => {
		const probe = http.createServer();

		const cleanup = () => {
			probe.removeAllListeners('error');
			probe.removeAllListeners('listening');
		};

		probe.once('error', (error) => {
			cleanup();

			if (error.code === 'EADDRINUSE') {
				tryPort(port + 1);
				return;
			}

			reject(error);
		});

		probe.once('listening', () => {
			probe.close((closeError) => {
				cleanup();
				if (closeError) {
					reject(closeError);
					return;
				}
				resolve(port);
			});
		});

		probe.listen(port);
	};

	tryPort(startPort);
});

const startServer = async () => {
	const port = await findAvailablePort(preferredPort);
	const server = http.createServer(serveStatic);

	server.listen(port, () => {
		log(`Serving dist at http://localhost:${port}`);
	});
};

const watchSource = () => {
	try {
		const watcher = watch(srcDir, { recursive: true });
		watcher.on('change', scheduleBuild);
		watcher.on('rename', scheduleBuild);
		log('Watching src for changes...');
	} catch (error) {
		console.error('[dev] Watch failed:', error.message);
	}
};

const main = async () => {
	await ensureDistExists();
	await performBuild();
	watchSource();
	await startServer();
};

main().catch((error) => {
	console.error('[dev] Unexpected error:', error);
	process.exit(1);
});
