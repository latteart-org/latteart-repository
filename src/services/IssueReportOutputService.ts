/**
 * Copyright 2021 NTT Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as XLSX from "xlsx";
import path from "path";

export interface IssueReportOutputService {
  output(
    outputDirectoryPath: string,
    reportSource: {
      testMatrixName: string;
      rows: {
        testPurposeValue: string;
        testPurposeDetails: string;
        noteValue: string;
        noteDetails: string;
        groupName: string;
        testTargetName: string;
        viewPointName: string;
        sessionName: string;
        testItem: string;
      }[];
    }
  ): void;
}

export class IssueReportOutputServiceImpl implements IssueReportOutputService {
  public output(
    outputDirectoryPath: string,
    reportSource: {
      testMatrixName: string;
      rows: {
        testPurposeValue: string;
        testPurposeDetails: string;
        noteValue: string;
        noteDetails: string;
        groupName: string;
        testTargetName: string;
        viewPointName: string;
        sessionName: string;
        testItem: string;
      }[];
    }
  ): void {
    const report = new IssueReport(reportSource.testMatrixName);
    for (const row of reportSource.rows) {
      report.addRow(row);
    }

    const workbook = XLSX.utils.book_new();

    const ws = XLSX.utils.aoa_to_sheet([Object.values(report.header)]);

    report.rows.forEach((row, index) => {
      XLSX.utils.sheet_add_aoa(ws, [Object.values(row)], {
        origin: `A${index + 2}`,
      });
    });

    XLSX.utils.book_append_sheet(workbook, ws, "Sheet");

    const filePath = path.join(
      outputDirectoryPath,
      `${report.sanitizeName}.xlsx`
    );

    XLSX.writeFile(workbook, filePath);
  }
}

interface IssueReportRow {
  groupName: string;
  testTargetName: string;
  viewPointName: string;
  sessionName: string;
  testItem: string;
  testPurposeValue: string;
  testPurposeDetails: string;
  noteValue: string;
  noteDetails: string;
}

class IssueReport {
  private _name: string;

  private _header: IssueReportRow = {
    groupName: "GroupName",
    testTargetName: "TestTargetName",
    viewPointName: "ViewPointName",
    sessionName: "Session",
    testItem: "TestItem",
    testPurposeValue: "TestPurpose",
    testPurposeDetails: "TestPurposeDetails",
    noteValue: "Note",
    noteDetails: "NoteDetails",
  };
  private _rows: IssueReportRow[] = [];

  get name(): string {
    return this._name;
  }

  get sanitizeName(): string {
    return this._name
      .replace(/"/g, "_")
      .replace(/</g, "_")
      .replace(/>/g, "_")
      .replace(/\|/g, "_")
      .replace(/:/g, "_")
      .replace(/\*/g, "_")
      .replace(/\?/g, "_")
      .replace(/\\/g, "_")
      .replace(/\//g, "_");
  }

  get header(): IssueReportRow {
    return this._header;
  }

  set header(value: IssueReportRow) {
    this._header = value;
  }

  get rows(): IssueReportRow[] {
    return this._rows;
  }

  constructor(name: string) {
    this._name = name;
  }

  public addRow(row: IssueReportRow): void {
    this._rows.push(row);
  }
}
