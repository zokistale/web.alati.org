const APP_NAV_LINKS = [
	{ href: '/', label: 'Home' },
	{ href: 'random-emails', label: 'Email Generator' },
	{ href: 'random-names', label: 'Name Generator' },
	{ href: 'random-strings', label: 'String Generator' },
	{ href: 'text-transformer', label: 'Text Transformer' },
	{ href: 'macedonian-fonts', label: 'Macedonian Fonts' },
	{ href: 'en-mk-converter', label: 'EN-MK Converter' },
	{ href: 'html-keyboard', label: 'HTML Keyboard' },
	{ href: 'mkd-exchange-rates', label: 'MKD Exchange Rates' },
];

const APP_NAV_ICONS = {
	home: '<x-icon-home class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-home>',
	email: '<x-icon-email class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-email>',
	name: '<x-icon-name class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-name>',
	string: '<x-icon-string class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-string>',
	transform: '<x-icon-transform class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-transform>',
	font: '<x-icon-font class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-font>',
	convert: '<x-icon-convert class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-convert>',
	html: '<x-icon-html class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-html>',
	mkd: '<x-icon-dollar class="size-[1.2em] shrink-0" aria-hidden="true"></x-icon-dollar>'
};

export function normalizePageKey(value) {
	const cleaned = value?.split('?')[0]?.split('#')[0] ?? '';

	if (!cleaned || cleaned === '/') {
		return '/';
	}

	const normalized = cleaned
		.replace(/\/index\.html$/i, '/')
		.replace(/\.html$/i, '')
		.replace(/\/+$/g, '')
		.replace(/^\/+/, '');

	return normalized || '/';
}

function getCurrentPage(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
	return normalizePageKey(pathname);
}

export function getCurrentPageLink(pathname) {
	const currentPage = getCurrentPage(pathname);

	return APP_NAV_LINKS.find(({ href }) => normalizePageKey(href) === currentPage) || null;
}

function getNavigationIcon(href) {
	if (href === '/') {
		return APP_NAV_ICONS.home;
	}

	if (href.includes('email')) {
		return APP_NAV_ICONS.email;
	}

	if (href.includes('name')) {
		return APP_NAV_ICONS.name;
	}

	if (href.includes('string')) {
		return APP_NAV_ICONS.string;
	}

	if (href.includes('text-transformer')) {
		return APP_NAV_ICONS.transform;
	}

	if (href.includes('font')) {
		return APP_NAV_ICONS.font;
	}

	if (href.includes('converter')) {
		return APP_NAV_ICONS.convert;
	}

	if (href.includes('html-keyboard')) {
		return APP_NAV_ICONS.html;
	}

	if (href.includes('mkd-exchange-rates')) {
		return APP_NAV_ICONS.mkd;
	}

	return null;
}

function buildPageTitle() {
	const currentLink = getCurrentPageLink();

	if (!currentLink) {
		return '';
	}

	const iconMarkup = getNavigationIcon(currentLink.href);

	return `
		<span class="inline-flex items-center gap-3">
			${iconMarkup || ''}
			<span>${currentLink.label}</span>
		</span>
	`;
}

function buildAppNavigation() {
	const currentPage = getCurrentPage();

	return `
		<nav class="grid gap-2 mb-5" aria-label="Tool navigation">
			${APP_NAV_LINKS.map(({ href, label }) => {
				const isActive = normalizePageKey(href) === currentPage;
				const iconMarkup = getNavigationIcon(href);
				const stateClasses = isActive
					? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold shadow-sm'
					: 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700';

				return `
					<a href="${href}" class="flex items-center gap-3 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 transition-colors ${stateClasses}"${isActive ? ' aria-current="page"' : ''}>
						${iconMarkup || ''}
						<span>${label}</span>
					</a>
				`;
			}).join('')}
		</nav>
	`;
}

const mountAppNavigation = () => {
	document.querySelectorAll('[data-app-navigation]').forEach((container) => {
		container.innerHTML = buildAppNavigation();
	});

	document.querySelectorAll('[data-app-page-title]').forEach((container) => {
		container.innerHTML = buildPageTitle();
	});
};

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mountAppNavigation);
	} else {
		mountAppNavigation();
	}
}