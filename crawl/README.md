# Submitting mrsanabolics.com to Google

Everything needed to get the site into Google Search, in the order to do it. The URL lists in
this folder were generated from the site's own sitemap on 20 September 2026; regenerate them any
time with the command at the foot of this file.

The site publishes **894 addresses**: the home page and 7 other standing pages, 9 category pages,
38 compound pages, 41 manufacturer pages, 6 journal articles and 792 products.

---

## 1. The two addresses Google needs

| What | Address |
|---|---|
| Sitemap | `https://mrsanabolics.com/sitemap.xml` |
| Crawler rules | `https://mrsanabolics.com/robots.txt` |

The sitemap is generated from the database on every request, so a product added in the admin
appears in it without anyone touching code. `robots.txt` already points at it, and already keeps
crawlers out of `/account`, `/checkout` and `/auth`, which have nothing to index.

## 2. Add the site to Search Console

1. Go to [search.google.com/search-console](https://search.google.com/search-console) and sign in.
   An existing account can hold this site alongside any other; the two never affect each other.
2. **Add property → Domain** → enter `mrsanabolics.com` (no `https://`, no `www`).
3. Google shows a **TXT record**. It must be added to the domain's DNS, which is managed at
   **Vercel** (the domain's name servers are `ns1.vercel-dns.com` / `ns2.vercel-dns.com`), not at
   Hostinger. Either add it yourself under Vercel → Domains → mrsanabolics.com → DNS Records, or
   send the record to Claude to add. It is not secret.
4. Press **Verify**.

## 3. Submit the sitemap

In Search Console: **Sitemaps** → enter `sitemap.xml` → **Submit**. That is the whole catalogue
handed over in one go. Google then crawls on its own schedule — expect days for the first pages
and weeks for all 894. "Discovered, not indexed" on many products early on is normal.

## 4. Ask for the important pages by hand

The **URL Inspection** box at the top of Search Console takes one address at a time and has a
**Request indexing** button. Google does not publish the daily limit; it is widely reported as
about 10–20 a day, and shared across all sites in one account.

Spend them on [`priority-urls.txt`](priority-urls.txt) — 22 addresses, in a sensible order:

1. the home page, shop, categories, manufacturers, journal, about and FAQ;
2. the 9 category pages;
3. the 6 journal articles.

Do **not** spend them on individual products. The sitemap covers those, and there are 792.

## 5. Then the compound pages

[`compound-urls.txt`](compound-urls.txt) holds the 38 pages built to be found by the name of a
compound — the ones most likely to bring a visitor who is ready to buy. Feed them in over a few
days once the priority list is done.

## Files here

| File | What it holds |
|---|---|
| `priority-urls.txt` | 22 pages to request by hand first |
| `compound-urls.txt` | 38 compound pages, next in line |
| `all-urls.txt` | all 894 addresses, as the sitemap lists them |

## Worth knowing before you start

- **Getting indexed is not the same as ranking.** Search Console gets the pages into Google's
  index; where they place depends on the content and on links from other sites, which in this
  field is where most competitors' standing comes from.
- **Don't request indexing repeatedly for the same page.** It does not make Google come sooner.
- **Google Ads will not accept these products.** Organic search is the channel.
- **If the site ever moves to another domain**, set `NEXT_PUBLIC_SITE_URL` in Vercel first, or
  every page will keep telling Google its real address is this one.

## Regenerating these lists

```bash
curl -s https://mrsanabolics.com/sitemap.xml |
  grep -oE "<loc>[^<]+</loc>" | sed -E "s#</?loc>##g" > crawl/all-urls.txt
```

The priority and compound lists are subsets of that file: compound pages are the ones matching
`/shop/<category>/<compound>`, and category pages are `/shop/<category>`.
