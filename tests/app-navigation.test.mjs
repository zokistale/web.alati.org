import test from 'node:test';
import assert from 'node:assert/strict';

import { getCurrentPageLink, normalizePageKey } from '../src/js/app-navigation.js';

test('normalizePageKey handles Cloudflare-style trailing slash routes', () => {
	assert.equal(normalizePageKey('/html-keyboard/'), 'html-keyboard');
	assert.equal(normalizePageKey('/random-names/'), 'random-names');
	assert.equal(normalizePageKey('/index.html'), '/');
	assert.equal(normalizePageKey('html-keyboard.html'), 'html-keyboard');
});

test('getCurrentPageLink resolves deployed routes to the correct page label', () => {
	assert.equal(getCurrentPageLink('/html-keyboard/').label, 'HTML Keyboard');
	assert.equal(getCurrentPageLink('/random-names/').label, 'Name Generator');
});
