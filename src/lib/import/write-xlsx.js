/**
 * Build an .xlsx workbook from rows of text (the first row is the header).
 * @param {string[][]} rows
 * @param {string} sheetName
 * @returns {Promise<Buffer>}
 */
export async function buildXlsx(rows, sheetName = 'Issues') {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRows(rows.map((row) => row.map((cell) => (cell === '' ? null : String(cell)))));
  const header = sheet.getRow(1);
  header.font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 22;
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
