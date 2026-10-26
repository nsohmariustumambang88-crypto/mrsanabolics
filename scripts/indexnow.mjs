/*
  Tell Bing (and the other IndexNow engines: Yandex, Seznam, Naver) about the site's pages.

  Bing is what ChatGPT search, Copilot and DuckDuckGo read, and in October 2026 it held almost
  none of this site. IndexNow is the push channel: one POST lists up to 10,000 URLs, and the
  engines fetch them instead of waiting to discover them. Ownership is proven by the key file
  at /<key>.txt (public/), which must stay deployed.

  Usage, after a deploy:
    node scripts/indexnow.mjs                 # every URL in the live sitemap
    node scripts/indexnow.mjs /path /other    # just these paths (after changing a few pages)
  No .env needed: the key is public by design.
*/

const HOST = 'www.mrsanabolics.com';
const KEY = '66a4cbfef674424b4b2d013361099512';
const BASE = `https://${HOST}`;

const paths = process.argv.slice(2);
let urls;
if (paths.length) {
  urls = paths.map((p) => (p.startsWith('http') ? p : BASE + (p.startsWith('/') ? p : `/${p}`)));
} else {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const keyCheck = await fetch(`${BASE}/${KEY}.txt`);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  console.error(`The key file ${BASE}/${KEY}.txt is not live. Deploy public/${KEY}.txt first.`);
  process.exit(1);
}

for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: batch }),
  });
  /* 200 = accepted, 202 = accepted and key validation pending; anything else is a refusal. */
  console.log(`IndexNow: ${batch.length} URLs → HTTP ${res.status} ${res.status < 300 ? 'accepted' : await res.text()}`);
}
