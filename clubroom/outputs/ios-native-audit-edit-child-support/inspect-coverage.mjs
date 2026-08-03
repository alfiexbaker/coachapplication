import fs from "node:fs/promises";
import { Workbook } from "@oai/artifact-tool";

const coveragePath = new URL(
  "../../reviews/ios-native-audit/coverage.csv",
  import.meta.url,
);
const csvText = await fs.readFile(coveragePath, "utf8");
const workbook = await Workbook.fromCSV(csvText, { sheetName: "Coverage" });

const overview = await workbook.inspect({
  kind: "sheet,region",
  sheetId: "Coverage",
  range: "A1:A8",
  maxChars: 2500,
  tableMaxRows: 8,
  tableMaxCols: 1,
});
process.stdout.write(`${overview.ndjson}\n`);

const preview = await workbook.render({
  sheetName: "Coverage",
  range: "A1:G8",
  scale: 1,
  format: "png",
});
await fs.writeFile(
  new URL("coverage-before.png", import.meta.url),
  new Uint8Array(await preview.arrayBuffer()),
);

const csvHelp = workbook.help("csv export", {
  search: "CSV|csv|export",
  include: "index,examples,notes",
  maxChars: 5000,
});
process.stdout.write(`${csvHelp.ndjson}\n`);
