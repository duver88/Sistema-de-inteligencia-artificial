/**
 * Shared CSV format for exporting and re-importing a bot's knowledge base.
 *
 * The contract is round-trip fidelity: exporting a knowledge base and importing
 * that same file back must produce an identical knowledge base. That is why the
 * parser here is fully deterministic and hand-written — a file recognised as a
 * LionsCore export never goes through the AI extraction path, which is lossy,
 * costs tokens and would reword the entries.
 *
 * The parser is also NOT run through the `xlsx` library on purpose: that library
 * coerces cell values while reading (a value like "563,000,000" or "01" can come
 * back as a number), which would silently change the user's data.
 */

/** Header row written by the export, and expected by the import. */
export const EXPORT_COLUMNS = ['key', 'value', 'category', 'project'] as const;

export interface KnowledgeRow {
  key: string;
  value: string;
  category: string;
  /** Project name, or an empty string for entries that are global to the bot. */
  project: string;
}

// ── Serialisation ────────────────────────────────────────────────────────────

/**
 * RFC 4180 cell. Every cell is quoted unconditionally: that keeps commas,
 * quotes and newlines inside a value intact, and makes the output stable
 * (the same entry always serialises to the same bytes).
 */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(rows: KnowledgeRow[]): string {
  const lines = [
    EXPORT_COLUMNS.join(','),
    ...rows.map(r => [r.key, r.value, r.category, r.project].map(csvCell).join(',')),
  ];
  // Leading BOM so Excel opens the file as UTF-8 and does not mangle accents.
  // parseCsv() strips it again on the way back in.
  return `﻿${lines.join('\r\n')}`;
}

// ── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Minimal RFC 4180 parser: handles quoted cells, escaped quotes (""), and
 * embedded commas and newlines. Accepts CRLF, LF and CR line endings.
 */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++; // consume the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\r' || char === '\n') {
      // Swallow the LF of a CRLF pair so it does not open an empty row.
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  // Flush the last cell/row unless the file ended with a newline.
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Drop rows that are entirely empty (trailing blank lines, stray separators).
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

/**
 * True when a header row is a LionsCore knowledge export.
 *
 * Only `key` and `value` are required, and the check is case/space insensitive:
 * a user who opens the export in Excel, deletes the `project` column and saves
 * it again still gets the exact (non-AI) import path.
 */
export function isKnowledgeExportHeader(header: string[] | undefined): boolean {
  if (!header || header.length < 2) return false;
  const normalized = header.map(h => h.trim().toLowerCase());
  return normalized[0] === 'key' && normalized[1] === 'value';
}

/**
 * Turn parsed CSV rows into knowledge rows. Assumes the header has already been
 * accepted by isKnowledgeExportHeader(). Columns are located by name so the
 * order can differ, and rows without a key or a value are skipped.
 */
export function rowsToKnowledge(rows: string[][]): KnowledgeRow[] {
  const [header, ...body] = rows;
  const columns = header.map(h => h.trim().toLowerCase());
  const indexOf = (name: string) => columns.indexOf(name);

  const keyIdx = indexOf('key');
  const valueIdx = indexOf('value');
  const categoryIdx = indexOf('category');
  const projectIdx = indexOf('project');

  const at = (row: string[], idx: number) => (idx >= 0 ? (row[idx] ?? '') : '');

  return body
    .map(row => ({
      key: at(row, keyIdx).trim(),
      value: at(row, valueIdx).trim(),
      category: at(row, categoryIdx).trim() || 'general',
      project: at(row, projectIdx).trim(),
    }))
    .filter(r => r.key !== '' && r.value !== '');
}
