/*
  Addresses for the catalogue's collection pages. One module, so no link can drift from the
  route that serves it.

    /shop/<category>            a category: injectables, orals, post-cycle…
    /shop/<category>/<group>    a compound group within it: testosterone-enanthate, anavar-oxandrolone…

  These replaced `/shop?category=x&group=y`, which search engines could not rank: every one of
  those addresses declared `/shop` as its canonical, carried the shop's title and no heading, and
  was built in the browser, so a crawler saw no products at all.

  The group's URL segment comes from its DISPLAY name, not the folder key it is stored under.
  The folder keys are whatever the photographs were filed as — "enantat", "armidex",
  "litrozole", "steroids" for the blends — and none of them is a word anyone searches for.
  "Testosterone Enanthate" becomes `testosterone-enanthate`, which is. Renaming a group
  therefore changes its address; add a redirect in next.config.js if that ever happens.

  Pure functions with no imports: used by server pages, client components and the sitemap alike.
*/

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function categoryPath(categorySlug: string): string {
  return `/shop/${categorySlug}`;
}

/** The URL segment for a group, from the name it is shown under. */
export function groupSlug(groupName: string): string {
  return slugify(groupName);
}

export function groupPath(categorySlug: string, groupName: string): string {
  return `/shop/${categorySlug}/${groupSlug(groupName)}`;
}

/** Where a product's own group lives, or its category when it has none. */
export function collectionPathFor(product: {
  categorySlug: string;
  subcategoryName?: string | null;
}): string {
  return product.subcategoryName
    ? groupPath(product.categorySlug, product.subcategoryName)
    : categoryPath(product.categorySlug);
}
