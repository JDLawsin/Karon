import "server-only";

import { Buffer } from "node:buffer";

import { readSheet } from "read-excel-file/node";

import {
  ImportFileError,
  parseCsv,
  sourceFromMatrix,
  type ImportSource
} from "@/features/patient-import/patient-import";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const cellText = (cell: unknown) => {
  if (cell === null || cell === undefined) {
    return "";
  }

  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10);
  }

  return String(cell);
};

const parsePatientImportFile = async (
  bytes: ArrayBuffer,
  contentType: string,
  itemLabel = "patient"
): Promise<ImportSource> => {
  const buffer = Buffer.from(bytes);

  if (contentType === XLSX_CONTENT_TYPE) {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new ImportFileError("The XLSX file is not a valid Excel workbook.");
    }

    const rows = await readSheet(buffer);
    return sourceFromMatrix(rows.map((row) => row.map(cellText)), itemLabel);
  }

  return sourceFromMatrix(parseCsv(buffer.toString("utf8")), itemLabel);
};

export { XLSX_CONTENT_TYPE, parsePatientImportFile };
