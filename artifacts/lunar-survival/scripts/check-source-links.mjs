import { pathToFileURL } from 'node:url';
import { NASA_SOURCES } from '../src/game/science-content.js';

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const TRANSIENT = new Set([401, 403, 408, 425, 429]);
const MAX_BYTES = 64 * 1024;

function nasaUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')
    || !(url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'))) {
    throw new Error('Expected an HTTPS URL on nasa.gov or a NASA subdomain');
  }
  return url;
}

async function prefix(response) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value.subarray(0, MAX_BYTES - length);
      chunks.push(chunk);
      length += chunk.length;
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function discard(response) {
  await response.body?.cancel();
}

function tokens(text) {
  return text.toLowerCase().replace(/&[^;]+;/g, ' ').match(/[a-z0-9]+/g)
    ?.filter((word) => word.length > 2 && !['the', 'and', 'for', 'nasa'].includes(word)) ?? [];
}

function inspectPage(bytes, contentType, source, finalUrl) {
  const text = new TextDecoder().decode(bytes);
  const pdf = text.startsWith('%PDF-');
  const expectsPdf = /\.pdf$/i.test(new URL(source.url).pathname)
    || /\.pdf$/i.test(new URL(finalUrl).pathname) || contentType.includes('application/pdf');
  if (expectsPdf) {
    return pdf
      ? { kind: 'pdf', reasons: [] }
      : { kind: 'unknown', reasons: ['Expected a PDF but the response has no PDF signature; inspect the page manually.'] };
  }
  if (pdf) return { kind: 'pdf', reasons: [] };
  if (!/text\/html|application\/xhtml\+xml/.test(contentType)) {
    return { kind: 'unknown', reasons: [`Unexpected content type: ${contentType || '(missing)'}.`] };
  }
  const title = text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const reasons = [];
  if (!title) reasons.push('No HTML title found in the first 64 KiB; inspect the page manually.');
  else if (/\b(404|not found|access denied|forbidden|just a moment|service unavailable|verify you are human)\b/i.test(title)) {
    reasons.push(`Possible error or access-challenge page: "${title}".`);
  } else {
    const expected = tokens(source.title);
    const actual = new Set(tokens(title));
    if (expected.length && expected.filter((word) => actual.has(word)).length / expected.length < 0.45) {
      reasons.push(`Page title may no longer match the source: "${title}".`);
    }
  }
  return { kind: 'html', pageTitle: title, reasons };
}

// This checks link availability, not whether a source supports a scientific claim.
export async function checkSource(id, source, {
  fetchImpl = fetch, timeoutMs = 15000, retries = 1,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const result = { id, title: source.title, url: source.url, finalUrl: source.url, redirects: [], attempts: 0 };
  try {
    nasaUrl(source.url);
  } catch (error) {
    return { ...result, status: 'failed', reasons: [error.message] };
  }
  for (let attempt = 0; attempt <= retries; attempt++) {
    result.attempts++;
    result.redirects = [];
    result.finalUrl = source.url;
    delete result.httpStatus;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let retry = false;
    try {
      let current = nasaUrl(source.url);
      const seen = new Set([current.href]);
      for (;;) {
        result.finalUrl = current.href;
        const response = await fetchImpl(current.href, {
          method: 'GET', redirect: 'manual', signal: controller.signal,
          headers: { Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.1' },
        });
        result.httpStatus = response.status;
        if (REDIRECTS.has(response.status)) {
          const location = response.headers.get('location');
          await discard(response);
          if (!location) return { ...result, status: 'failed', reasons: ['Redirect has no Location header.'] };
          let next;
          try {
            next = nasaUrl(new URL(location, current).href);
          } catch {
            return { ...result, status: 'needs_review', reasons: ['Redirect leaves trusted HTTPS NASA hosts; not followed.'] };
          }
          result.redirects.push({ from: current.href, to: next.href, status: response.status });
          if (seen.has(next.href) || result.redirects.length > 5) {
            return { ...result, status: 'failed', reasons: ['Redirect loop or more than five redirects.'] };
          }
          seen.add(next.href);
          current = next;
          continue;
        }
        if (TRANSIENT.has(response.status) || response.status >= 500) {
          await discard(response);
          result.status = 'needs_review';
          result.reasons = [`HTTP ${response.status}: access may be blocked or temporarily unavailable; retry or check manually.`];
          retry = true;
          break;
        }
        if (!response.ok) {
          await discard(response);
          return { ...result, status: 'failed', reasons: [`HTTP ${response.status}.`] };
        }
        const inspection = inspectPage(await prefix(response),
          (response.headers.get('content-type') || '').toLowerCase(), source, current.href);
        const reasons = [...inspection.reasons];
        // Trailing slashes and fragments don't indicate that a reference moved.
        const canonical = (url) => {
          const parsed = new URL(url);
          parsed.hash = '';
          parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
          return parsed.href;
        };
        if (canonical(source.url) !== canonical(current.href)) {
          reasons.push('Source redirected to a different URL; confirm it still supports the cited concept.');
        }
        if (source.status !== 'verified') reasons.push('Source is not marked verified in the source list.');
        return { ...result, ...inspection, status: reasons.length ? 'needs_review' : 'ok', reasons };
      }
    } catch (error) {
      result.status = 'needs_review';
      result.reasons = [controller.signal.aborted
        ? `Timed out after ${timeoutMs} ms; availability is unconfirmed.`
        : `Network/read error: ${error.message}; availability is unconfirmed.`];
      retry = true;
    } finally {
      clearTimeout(timer);
    }
    if (!retry || attempt === retries) return result;
    // Bounded backoff keeps an opt-in demo check from hanging on a blocked host.
    await sleep(500 * (attempt + 1));
  }
}

export async function checkSources(sources = NASA_SOURCES, options = {}) {
  const results = [];
  // Sequential requests avoid flooding NASA hosts.
  for (const [id, source] of Object.entries(sources)) results.push(await checkSource(id, source, options));
  const summary = { ok: 0, needs_review: 0, failed: 0 };
  for (const result of results) summary[result.status]++;
  return { checkedAt: new Date().toISOString(), summary, results };
}

export function exitCode(report) {
  return report.summary.failed ? 1 : report.summary.needs_review ? 2 : 0;
}

export async function main(args = process.argv.slice(2)) {
  const options = {};
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') json = true;
    else if (arg === '--help') {
      console.log('Opt-in NASA source check: [--json] [--timeout-ms 15000] [--retries 1]\nExit: 0 all resolve; 1 broken/invalid links; 2 manual re-verification needed; 3 usage error.');
      return 0;
    } else if (arg === '--timeout-ms' || arg === '--retries') {
      const value = Number(args[++i]);
      const valid = Number.isInteger(value) && (arg === '--retries' ? value >= 0 && value <= 3 : value >= 1 && value <= 120000);
      if (!valid) throw new Error(`Invalid ${arg} value`);
      options[arg === '--retries' ? 'retries' : 'timeoutMs'] = value;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  const report = await checkSources(NASA_SOURCES, options);
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`NASA source-link check — ${report.checkedAt}`);
    for (const item of report.results) {
      console.log(`\n[${item.status.toUpperCase()}] ${item.id}: ${item.title}\n  ${item.url}`);
      if (item.redirects.length) {
        for (const hop of item.redirects) console.log(`  HTTP ${hop.status} → ${hop.to}`);
      }
      console.log(`  Final: ${item.finalUrl} | HTTP ${item.httpStatus ?? 'unavailable'} | ${item.kind ?? 'unknown'} | attempts: ${item.attempts}`);
      for (const reason of item.reasons) console.log(`  ${reason}`);
    }
    console.log(`\n${report.summary.ok} OK; ${report.summary.failed} failed; ${report.summary.needs_review} need re-verification.`);
    console.log('Availability is not scientific verification. No source or gameplay files were changed.');
  }
  return exitCode(report);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(error.message);
    process.exitCode = 3;
  });
}
