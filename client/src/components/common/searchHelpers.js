// Shared search helpers: normalize strings and build tokenized search predicate
export const normalizeString = (s = '') =>
  s.toString().toLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');

export const equalsNormalized = (a, b) => normalizeString(a) === normalizeString(b);

// Build a predicate that checks whether every token in `query` exists in at least one of
// the product's searchable fields (name, size, type). Works with both API and local model
// shapes (name/Nazwa, size/Rozmiar, type/Typ).
export function buildSearchFilter(query) {
  const q = (query ?? '').toString().trim();
  const words = q ? normalizeString(q).split(/\s+/).filter(Boolean) : [];
  return (p) => {
    if (words.length === 0) return true;
    const name = normalizeString(p.name ?? p.Nazwa ?? '');
    const size = normalizeString(p.size ?? p.Rozmiar ?? '');
    const type = normalizeString(p.type ?? p.Typ ?? '');
    return words.every(w => name.includes(w) || size.includes(w) || type.includes(w));
  };
}

const searchHelpers = {
  normalizeString,
  equalsNormalized,
  buildSearchFilter,
};

export default searchHelpers;
