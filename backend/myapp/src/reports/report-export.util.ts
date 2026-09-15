import PDFDocument from 'pdfkit';

export interface ReportColumn {
  key: string;
  header: string;
}

/** CSV serialisation shared by every report type. Values are quoted only when needed. */
export function toCsv(columns: ReportColumn[], rows: Record<string, unknown>[]): string {
  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = columns.map((column) => escape(column.header)).join(',');
  const body = rows
    .map((row) => columns.map((column) => escape(row[column.key])).join(','))
    .join('\n');

  return `${header}\n${body}\n`;
}

/** A simple tabular PDF, sufficient for every Devlytics report type. */
export function toPdf(
  title: string,
  scope: string,
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { align: 'left' });
    doc.fontSize(10).fillColor('#5C6879').text(scope);
    doc.moveDown();

    const columnWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / columns.length;
    const startX = doc.page.margins.left;
    let y = doc.y;

    doc.fontSize(9).fillColor('#241d4d');
    columns.forEach((column, index) => {
      doc.text(column.header, startX + index * columnWidth, y, { width: columnWidth, ellipsis: true });
    });
    y += 16;
    doc
      .moveTo(startX, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .strokeColor('#E2E8F0')
      .stroke();
    y += 6;

    doc.fillColor('#475569');
    for (const row of rows) {
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      columns.forEach((column, index) => {
        const value = row[column.key];
        doc.text(value === null || value === undefined ? '' : String(value), startX + index * columnWidth, y, {
          width: columnWidth,
          ellipsis: true,
        });
      });
      y += 16;
    }

    doc.end();
  });
}
