import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const sourcePath = new URL('../../reviews/ios-native-audit/coverage.csv', import.meta.url);
const outputDir = new URL('./', import.meta.url);
const csvText = await fs.readFile(sourcePath, 'utf8');
const workbook = await Workbook.fromCSV(csvText, { sheetName: 'Evidence' });
const evidence = workbook.worksheets.getItem('Evidence');
const used = evidence.getUsedRange();
const rowCount = used.values.length;

evidence.showGridLines = false;
evidence.freezePanes.freezeRows(1);
evidence.freezePanes.freezeColumns(2);
evidence.getRange(`A1:AQ${rowCount}`).format = {
  font: { name: 'Aptos', size: 10, color: '#15213A' },
  verticalAlignment: 'top',
};
evidence.getRange('A1:AQ1').format = {
  fill: '#10192C',
  font: { name: 'Aptos', size: 10, bold: true, color: '#F4F7FC' },
  rowHeight: 34,
  verticalAlignment: 'center',
  wrapText: true,
  borders: { bottom: { style: 'medium', color: '#5FD38D' } },
};
evidence.getRange(`A2:AQ${rowCount}`).format.wrapText = true;
evidence.getRange(`A2:AQ${rowCount}`).format.rowHeight = 48;
evidence.getRange(`A2:A${rowCount}`).format.font = { bold: true, color: '#10192C' };
evidence.getRange(`A1:A${rowCount}`).format.columnWidth = 14;
evidence.getRange(`B1:C${rowCount}`).format.columnWidth = 24;
evidence.getRange(`D1:F${rowCount}`).format.columnWidth = 18;
evidence.getRange(`G1:AQ${rowCount}`).format.columnWidth = 22;
evidence.getRange(`AK2:AK${rowCount}`).conditionalFormats.add('containsText', {
  text: 'fixed',
  format: { fill: '#DDF7E8', font: { color: '#17643B', bold: true } },
});
evidence.getRange(`AK2:AK${rowCount}`).conditionalFormats.add('containsText', {
  text: 'blocked',
  format: { fill: '#FDE7E7', font: { color: '#9B1C1C', bold: true } },
});
evidence.getRange(`AK2:AK${rowCount}`).conditionalFormats.add('containsText', {
  text: 'pending',
  format: { fill: '#FFF3D6', font: { color: '#8A5900', bold: true } },
});

const summary = workbook.worksheets.add('Summary');
summary.showGridLines = false;
summary.getRange('A1:F2').merge();
summary.getRange('A1').values = [['Clubroom iOS audit evidence']];
summary.getRange('A1:F2').format = {
  fill: '#10192C',
  font: { name: 'Aptos Display', size: 22, bold: true, color: '#F4F7FC' },
  verticalAlignment: 'center',
  horizontalAlignment: 'left',
};
summary.getRange('A4:B4').values = [['Coverage', 'Count']];
summary.getRange('A5:A11').values = [
  ['Evidence records'],
  ['Fixed'],
  ['Passed'],
  ['Blocked'],
  ['Pending'],
  ['Critical'],
  ['High'],
];
summary.getRange('B5:B11').formulas = [
  [`=COUNTA('Evidence'!$A$2:$A$${rowCount})`],
  [`=COUNTIF('Evidence'!$AK$2:$AK$${rowCount},"fixed")`],
  [`=COUNTIF('Evidence'!$AK$2:$AK$${rowCount},"passed")`],
  [`=COUNTIF('Evidence'!$AK$2:$AK$${rowCount},"blocked")`],
  [`=COUNTIF('Evidence'!$AK$2:$AK$${rowCount},"pending")`],
  [`=COUNTIF('Evidence'!$AL$2:$AL$${rowCount},"critical")`],
  [`=COUNTIF('Evidence'!$AL$2:$AL$${rowCount},"high")`],
];
summary.getRange('D4:F4').values = [['Current slice', 'Result', 'Evidence ID']];
summary.getRange('D5:F9').values = [
  ['Create club update route', 'Fixed', 'ROUTE-002'],
  ['Lean composer', 'Fixed', 'UI-036'],
  ['Fastify write authority', 'Fixed', 'API-007'],
  ['Role and failure replay', 'Fixed', 'QA-012'],
  ['Post / audit RLS posture', 'Fixed', 'SEC-007'],
];
summary.getRange('A13:F13').merge();
summary.getRange('A13').values = [[
  'Open blockers remain visible in Evidence. This workbook does not convert ENV-003, ENV-004, ENV-006, LEGAL-001, or SEC-004 into passes.',
]];
summary.getRange('A4:B11').format = {
  font: { name: 'Aptos', size: 11, color: '#15213A' },
  borders: { insideHorizontal: { style: 'thin', color: '#D9E0EC' } },
};
summary.getRange('D4:F9').format = {
  font: { name: 'Aptos', size: 11, color: '#15213A' },
  borders: { insideHorizontal: { style: 'thin', color: '#D9E0EC' } },
};
summary.getRange('A4:B4').format = {
  fill: '#E9EEF7',
  font: { bold: true, color: '#10192C' },
  borders: { bottom: { style: 'medium', color: '#5FD38D' } },
};
summary.getRange('D4:F4').format = {
  fill: '#E9EEF7',
  font: { bold: true, color: '#10192C' },
  borders: { bottom: { style: 'medium', color: '#5FD38D' } },
};
summary.getRange('B5:B11').format = {
  font: { bold: true, color: '#10192C' },
  horizontalAlignment: 'right',
  numberFormat: '#,##0',
};
summary.getRange('E5:E9').format = {
  fill: '#DDF7E8',
  font: { bold: true, color: '#17643B' },
  horizontalAlignment: 'center',
};
summary.getRange('A13:F13').format = {
  fill: '#FFF3D6',
  font: { name: 'Aptos', size: 10, color: '#6C4700' },
  wrapText: true,
  rowHeight: 42,
  verticalAlignment: 'center',
};
summary.getRange('A1:F13').format.font.name = 'Aptos';
summary.getRange('A1:A13').format.columnWidth = 24;
summary.getRange('B1:B13').format.columnWidth = 12;
summary.getRange('C1:C13').format.columnWidth = 4;
summary.getRange('D1:D13').format.columnWidth = 30;
summary.getRange('E1:E13').format.columnWidth = 12;
summary.getRange('F1:F13').format.columnWidth = 16;

const summaryCheck = await workbook.inspect({
  kind: 'table',
  range: 'Summary!A1:F13',
  include: 'values,formulas',
  tableMaxRows: 13,
  tableMaxCols: 6,
});
const formulaErrors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
});
console.log(summaryCheck.ndjson);
console.log(formulaErrors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const summaryPreview = await workbook.render({
  sheetName: 'Summary',
  range: 'A1:F13',
  scale: 2,
  format: 'png',
});
await fs.writeFile(
  new URL('summary-preview.png', outputDir),
  new Uint8Array(await summaryPreview.arrayBuffer()),
);
const evidencePreview = await workbook.render({
  sheetName: 'Evidence',
  range: `A1:F12`,
  scale: 1,
  format: 'png',
});
await fs.writeFile(
  new URL('evidence-preview.png', outputDir),
  new Uint8Array(await evidencePreview.arrayBuffer()),
);
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(fileURLToPath(new URL('coverage.xlsx', outputDir)));
