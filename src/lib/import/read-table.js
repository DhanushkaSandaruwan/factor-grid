import { parseCsv } from '@/lib/csv-parse';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

/** Text of one spreadsheet cell, whatever kind of value Excel stored. */
export function cellText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('');
    if ('result' in value) return cellText(value.result);
    if ('text' in value) return cellText(value.text);
    if ('hyperlink' in value) return String(value.text ?? value.hyperlink);
    return '';
  }
  return String(value);
}

/**
 * Read the first worksheet of an .xlsx file, or a .csv file, into rows of text.
 * @param {Buffer} buffer
 * @param {string} fileName
 * @returns {Promise<{ error?: string, rows?: string[][] }>}
 */
export async function readTable(buffer, fileName) {
  if (buffer.length > MAX_IMPORT_BYTES) {
    return { error: `The file is larger than ${MAX_IMPORT_BYTES / (1024 * 1024)} MB.` };
  }
  const isXlsx = /\.xlsx$/i.test(fileName) || (buffer[0] === 0x50 && buffer[1] === 0x4b);
  if (!isXlsx) {
    if (!/\.csv$/i.test(fileName)) return { error: 'Upload an Excel (.xlsx) or CSV (.csv) file.' };
    return { rows: parseCsv(buffer.toString('utf8')) };
  }

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return { error: 'The Excel file could not be read. Save it again as .xlsx and upload it.' };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return { error: 'The Excel file has no worksheet.' };

  const rows = [];
  const width = sheet.columnCount;
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells = [];
    for (let c = 1; c <= width; c++) cells.push(cellText(row.getCell(c).value).trim());
    if (cells.some((c) => c !== '')) rows.push(cells);
  });
  if (rows.length > MAX_IMPORT_ROWS + 1) {
    return { error: `Import up to ${MAX_IMPORT_ROWS} rows at a time.` };
  }
  return { rows };
}
