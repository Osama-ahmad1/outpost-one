import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { checkSource, checkSources, exitCode } from './check-source-links.mjs';

const source = { title: 'Moon Facts', url: 'https://science.nasa.gov/moon/facts', status: 'verified' };
const html = (title = 'Moon Facts - NASA Science') => new Response(`<html><title>${title}</title></html>`, {
  headers: { 'content-type': 'text/html' },
});
const options = (fetchImpl, extra = {}) => ({ fetchImpl, retries: 0, sleep: async () => {}, ...extra });

test('accepts NASA HTML and does not change source metadata', async () => {
  const original = { ...source };
  const result = await checkSource('moon', source, options(async (url, init) => {
    assert.equal(url, source.url);
    assert.equal(init.redirect, 'manual');
    assert.equal(init.method, 'GET');
    return html();
  }));
  assert.equal(result.status, 'ok');
  assert.equal(result.kind, 'html');
  assert.equal(result.title, source.title);
  assert.equal(result.pageTitle, 'Moon Facts - NASA Science');
  assert.deepEqual(source, original);
});

test('follows relative NASA redirects and ignores trailing-slash normalization', async () => {
  const calls = [];
  const result = await checkSource('moon', source, options(async (url) => {
    calls.push(url);
    return calls.length === 1
      ? new Response(null, { status: 301, headers: { location: '/moon/facts/' } }) : html();
  }));
  assert.equal(result.status, 'ok');
  assert.equal(result.redirects.length, 1);
  assert.equal(result.finalUrl, `${source.url}/`);
});

test('follows cross-subdomain NASA moves but requests scientific re-verification', async () => {
  let calls = 0;
  const result = await checkSource('moon', source, options(async () => ++calls === 1
    ? new Response(null, { status: 302, headers: { location: 'https://www.nasa.gov/moon/' } }) : html()));
  assert.equal(calls, 2);
  assert.equal(result.status, 'needs_review');
  assert.match(result.reasons.join(), /different URL/);
});

test('never fetches untrusted hosts, credentials, ports, or HTTP redirects', async () => {
  for (const target of ['https://nasa.gov.evil.test/', 'https://evilnasa.gov/', 'http://www.nasa.gov/',
    'https://user:pass@www.nasa.gov/', 'https://www.nasa.gov:444/']) {
    let calls = 0;
    const result = await checkSource('moon', source, options(async () => {
      calls++;
      return new Response(null, { status: 302, headers: { location: target } });
    }));
    assert.equal(calls, 1);
    assert.equal(result.status, 'needs_review');
    const invalid = await checkSource('invalid', { ...source, url: target }, options(async () => assert.fail('must not fetch')));
    assert.equal(invalid.status, 'failed');
  }
});

test('reports invalid URLs, missing redirect locations, loops, and excessive hops', async () => {
  assert.equal((await checkSource('bad', { ...source, url: 'not a url' })).status, 'failed');
  for (const fetchImpl of [
    async () => new Response(null, { status: 301 }),
    async () => new Response(null, { status: 302, headers: { location: source.url } }),
    async (url) => new Response(null, { status: 307, headers: { location: `${url}/next` } }),
  ]) {
    assert.equal((await checkSource('moon', source, options(fetchImpl))).status, 'failed');
  }
});

test('accepts PDF bytes without an HTML title, including octet-stream delivery', async () => {
  for (const type of ['application/pdf', 'application/octet-stream']) {
    const result = await checkSource('pdf', { ...source, url: 'https://ntrs.nasa.gov/report.pdf' },
      options(async () => new Response('%PDF-1.7\nreport', { headers: { 'content-type': type } })));
    assert.equal(result.status, 'ok');
    assert.equal(result.kind, 'pdf');
  }
  const fakePdf = await checkSource('pdf', { ...source, url: 'https://ntrs.nasa.gov/report.pdf' }, options(async () => html()));
  assert.equal(fakePdf.status, 'needs_review');
});

test('reports permanent HTTP errors without retrying', async () => {
  for (const status of [404, 410, 400]) {
    const result = await checkSource('moon', source, options(async () => new Response(null, { status }), { retries: 2 }));
    assert.equal(result.status, 'failed');
    assert.equal(result.attempts, 1);
    assert.equal(result.httpStatus, status);
  }
});

test('retries transient statuses, allows recovery, and leaves persistent access errors unconfirmed', async () => {
  for (const status of [401, 403, 408, 425, 429, 500, 503]) {
    const failed = await checkSource('moon', source,
      options(async () => new Response(null, { status }), { retries: 1 }));
    assert.equal(failed.status, 'needs_review');
    assert.equal(failed.attempts, 2);
    let calls = 0;
    const recovered = await checkSource('moon', source, options(async () => ++calls === 1
      ? new Response(null, { status }) : html(), { retries: 1 }));
    assert.equal(recovered.status, 'ok');
    assert.equal(recovered.attempts, 2);
  }
});

test('handles network failures and timeouts during both headers and body reads', async () => {
  const network = await checkSource('moon', source, options(async () => { throw new Error('DNS failed'); }));
  assert.equal(network.status, 'needs_review');
  for (const bodyTimeout of [false, true]) {
    const result = await checkSource('moon', source, options(async (_url, { signal }) => {
      if (!bodyTimeout) return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
      return new Response(new ReadableStream({
        start(controller) {
          signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
        },
      }), { headers: { 'content-type': 'text/html' } });
    }, { timeoutMs: 10 }));
    assert.equal(result.status, 'needs_review');
    assert.match(result.reasons.join(), /Timed out/);
  }
});

test('flags soft errors, unrelated landing pages, missing titles, unsupported types, and unverified sources', async () => {
  for (const title of ['404 Not Found', 'Access Denied', 'Just a moment', 'NASA Home']) {
    assert.equal((await checkSource('moon', source, options(async () => html(title)))).status, 'needs_review');
  }
  for (const response of [
    new Response('<html>No title</html>', { headers: { 'content-type': 'text/html' } }),
    new Response('{}', { headers: { 'content-type': 'application/json' } }),
  ]) assert.equal((await checkSource('moon', source, options(async () => response))).status, 'needs_review');
  assert.equal((await checkSource('moon', { ...source, status: 'pending' }, options(async () => html()))).status, 'needs_review');
});

test('caps body reads and cancels downloads rather than downloading whole PDFs', async () => {
  let cancelled = false;
  const result = await checkSource('pdf', { ...source, url: 'https://ntrs.nasa.gov/report.pdf' }, options(async () =>
    new Response(new ReadableStream({
      start(controller) {
        const bytes = new Uint8Array(70000);
        bytes.set(new TextEncoder().encode('%PDF-1.7'));
        controller.enqueue(bytes);
      },
      cancel() { cancelled = true; },
    }), { headers: { 'content-type': 'application/pdf' } })));
  assert.equal(result.status, 'ok');
  assert.equal(cancelled, true);
});

test('aggregates every source and returns distinct exit codes', async () => {
  const report = await checkSources({ moon: source, other: { ...source, url: 'https://www.nasa.gov/missing' } },
    options(async (url) => url === source.url ? html() : new Response(null, { status: 404 })));
  assert.equal(report.results.length, 2);
  assert.deepEqual(report.summary, { ok: 1, failed: 1, needs_review: 0 });
  assert.equal(exitCode(report), 1);
  assert.equal(exitCode({ summary: { failed: 0, needs_review: 1 } }), 2);
  assert.equal(exitCode({ summary: { failed: 0, needs_review: 0 } }), 0);
});

test('clears a previous HTTP status when a retry fails before receiving headers', async () => {
  let calls = 0;
  const result = await checkSource('moon', source, options(async () => {
    if (++calls === 1) return new Response(null, { status: 503 });
    throw new Error('Connection reset');
  }, { retries: 1 }));
  assert.equal(result.status, 'needs_review');
  assert.equal(result.httpStatus, undefined);
});

test('CLI help and usage errors do not require network access', () => {
  const script = new URL('./check-source-links.mjs', import.meta.url);
  const help = spawnSync(process.execPath, [script.pathname, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Opt-in NASA source check/);
  for (const args of [['--unknown'], ['--timeout-ms', '0'], ['--retries', '4'], ['--timeout-ms']]) {
    const result = spawnSync(process.execPath, [script.pathname, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 3);
    assert.match(result.stderr, /Unknown option|Invalid/);
  }
});
