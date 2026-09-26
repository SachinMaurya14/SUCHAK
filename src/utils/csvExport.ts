/**
 * SUCHAK Professional CSV Export Utility
 * Conforms to RFC 4180 specification with UTF-8 BOM encoding for seamless Excel and Google Sheets compatibility.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | boolean | null | undefined);
}

export interface CsvExportOptions<T> {
  /**
   * The destination filename (e.g. suchak_incident_reports_2026-09-26.csv)
   */
  filename?: string;
  /**
   * Column definitions specifying headers and accessor functions or keys
   */
  columns: CsvColumn<T>[];
  /**
   * Data items to export
   */
  data: T[];
  /**
   * Whether to prepend the UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility. Defaults to true.
   */
  includeBom?: boolean;
}

/**
 * Escapes values in compliance with RFC 4180:
 * - Doubles internal double quotes (" -> "")
 * - Wraps fields in double quotes if they contain commas, newlines, or quotes
 * - Converts null/undefined to empty strings
 */
export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val).trim();
  // If string contains comma, quote, or newline characters, escape internal quotes and wrap
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Builds a standard CSV string from typed column definitions and records.
 */
export function generateCsvString<T>(
  columns: CsvColumn<T>[],
  data: T[],
  includeBom = true
): string {
  const headerRow = columns.map((col) => escapeCsvValue(col.header)).join(',');
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const rawValue =
          typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
        return escapeCsvValue(rawValue);
      })
      .join(',')
  );

  const fullContent = [headerRow, ...dataRows].join('\r\n');
  return includeBom ? `\uFEFF${fullContent}` : fullContent;
}

/**
 * Initiates an in-browser download of the dataset as a CSV file.
 * Automatically cleans up object URLs and DOM anchors.
 */
export function downloadCsv<T>(options: CsvExportOptions<T>): boolean {
  try {
    const { filename = 'suchak_export.csv', columns, data, includeBom = true } = options;
    const csvContent = generateCsvString(columns, data, includeBom);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    const resolvedFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    anchor.setAttribute('download', resolvedFilename);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('[CSV Export] Failed to download CSV file:', err);
    return false;
  }
}
