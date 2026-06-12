import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveRequestPath } from '../scripts/dev.mjs';

test('resolveRequestPath maps clean URLs to HTML files', () => {
	assert.equal(resolveRequestPath('/mkd-exchange-rates'), '/mkd-exchange-rates.html');
	assert.equal(resolveRequestPath('/mkd-exchange-rates/'), '/mkd-exchange-rates.html');
	assert.equal(resolveRequestPath('/'), '/index.html');
	assert.equal(resolveRequestPath('/random-names.html'), '/random-names.html');
});
