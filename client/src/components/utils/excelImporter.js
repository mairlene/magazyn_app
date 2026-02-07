import { BASE } from '../../services/api';

export const parseExcelFile = async (file) => {
  const XLSX = await import("xlsx");

  // Support CSV as well as Excel (.xlsx/.xls). For CSV, read as text and let
  // xlsx parse the string; for Excel files read as array buffer.
  const name = (file && file.name) ? String(file.name).toLowerCase() : '';
  const isCsv = name.endsWith('.csv') || file.type === 'text/csv';

  let workbook;
  if (isCsv) {
    const text = await file.text();
    // parse CSV text
    workbook = XLSX.read(text, { type: 'string' });
  } else {
    const data = await file.arrayBuffer();
    workbook = XLSX.read(data, { type: 'array' });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // header row used

  const norm = (s) => String(s || "").toLowerCase();

  return raw.map((r) => {
    const keys = Object.keys(r || {});
    const findKey = (variants) => {
      for (const k of keys) {
        const nk = norm(k);
        for (const v of variants) {
          if (nk.includes(v)) return k;
        }
      }
      return null;
    };

    const kNazwa = findKey(["nazwa", "name"]);
    const kRozmiar = findKey(["rozmiar", "size"]);
    const kTyp = findKey(["typ", "type", "category"]);
    const kMagazyn = findKey(["magazyn", "warehouse", "lokaliz"]);
    const kIlosc = findKey(["ilo", "quantity", "qty"]);

    return {
      Nazwa: String(kNazwa ? r[kNazwa] : r["Nazwa"] || r["Name"] || "").trim(),
      Rozmiar: String(
        kRozmiar ? r[kRozmiar] : r["Rozmiar"] || r["Size"] || ""
      ).trim(),
      Typ: String(kTyp ? r[kTyp] : r["Typ"] || r["Type"] || "").trim(),
      Magazyn: String(
        kMagazyn
          ? r[kMagazyn]
          : r["Magazyn"] || r["Warehouse"] || r["Lokalizacja"] || ""
      ).trim(),
      Ilość: Number(kIlosc ? r[kIlosc] : r["Ilość"] || r["Quantity"] || 0) || 0,
      // Explicitly ignore any ImageUrl column from Excel. Set to null so DB field remains empty/null.
      ImageUrl: null
    };
  });
};

export const importProductsFromFile = async (rows, options = {}) => {
  const userId =
    options.userId || localStorage.getItem("userId") || null;
  if (!userId)
    throw new Error("Brak userId w sesji. Zaloguj się ponownie.");
  const body = {
    rows,
    userId,
    options: {
      updateMode: options.updateMode || "add",
      createWarehouses: options.createWarehouses !== false,
    },
  };
  const res = await fetch(`${BASE}/api/products/import-full`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(txt || "Błąd serwera podczas importu");
  }
  return res.json();
};