// Product URL helpers.
//
// URL shape:  /product/<name-slug>-<id>      e.g. /product/paneer-puff-1792568492235
// The ID is the only thing used for lookup. The name part is decoration for
// humans and search engines, so renaming a product never breaks an old link,
// and old bare-ID links (/product/1792568492235) keep working.

export function slugify(name = '') {
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')        // non-latin names (Hindi etc.) collapse to '' here
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export function buildProductPath(product) {
  if (!product || product.id === undefined || product.id === null) return '/';
  const slug = slugify(product.name);
  return slug ? `/product/${slug}-${product.id}` : `/product/${product.id}`;
}

// Returns the product ID from a pathname, or null.
// Takes the trailing run of digits after the last hyphen (or the whole segment).
export function parseProductIdFromPath(pathname = window.location.pathname) {
  const m = pathname.match(/^\/product\/([^/?#]+)/);
  if (!m) return null;
  const seg = decodeURIComponent(m[1]);
  const idMatch = seg.match(/(?:^|-)(\d+)$/);
  return idMatch ? idMatch[1] : seg; // non-numeric IDs: fall back to the raw segment
}

// Keep the address bar in sync without adding history entries.
export function setProductUrl(product) {
  const target = buildProductPath(product);
  if (window.location.pathname !== target) {
    window.history.replaceState(window.history.state, '', target + window.location.search);
  }
}

export function clearProductUrl() {
  if (window.location.pathname.startsWith('/product/')) {
    window.history.replaceState(window.history.state, '', '/' + window.location.search);
  }
}
