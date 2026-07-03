/**
 * Minimal dependency-free CSV parser.
 * Handles quoted fields, escaped quotes (""), embedded commas/newlines, and
 * auto-detects the delimiter (comma or semicolon — common in PL Excel exports).
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

function detectDelimiter(sample: string): string {
  // Look only at the first line to decide.
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ",";
}

/** Parse CSV text into headers + rows. Empty trailing lines are ignored. */
export function parseCsv(text: string, delimiterOverride?: string): ParsedCsv {
  // Strip a UTF-8 BOM if present.
  const input = text.replace(/^\uFEFF/, "");
  const delimiter = delimiterOverride || detectDelimiter(input);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore; handled with \n
    } else {
      field += ch;
    }
  }

  // Flush the final field/row if there is leftover content.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully empty rows.
  const cleaned = rows.filter((r) => r.some((c) => c.trim().length > 0));
  const headers = (cleaned.shift() ?? []).map((h) => h.trim());

  return { headers, rows: cleaned, delimiter };
}

/** Parse a localized number: handles "1 234,56", "1.234,56", "1,234.56". */
export function parseNumber(raw: string): number {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  // Remove currency symbols, spaces (incl. non-breaking) and letters.
  s = s.replace(/[^\d.,-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // The right-most separator is the decimal one; the other groups thousands.
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // Only commas — treat as decimal separator.
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // Only dots (or none) — already JS-parseable after removing stray commas.
    s = s.replace(/,/g, "");
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
