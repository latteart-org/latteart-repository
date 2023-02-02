/**
 * Copyright 2022 NTT Corporation.
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
        tags: string;
        groupName: string;
        testTargetName: string;
        viewPointName: string;
        sessionName: string;
        tester: string;
        memo: string;
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
        tags: string;
        groupName: string;
        testTargetName: string;
        viewPointName: string;
        sessionName: string;
        tester: string;
        memo: string;
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

    XLSX.utils.book_append_sheet(workbook, ws, "Findings");

    const testPurposeRows = reportSource.rows.reduce(
      (acc: testPurposeSheetRow[], row) => {
        const lastItem = acc.at(-1);

        if (!lastItem) {
          acc.push({
            groupName: row.groupName,
            testTargetName: row.testTargetName,
            viewPointName: row.viewPointName,
            sessionName: row.sessionName,
            testPurposeValue: row.testPurposeValue,
            testPurposeDetails: row.testPurposeDetails,
          });
        } else if (
          lastItem.groupName === row.groupName &&
          lastItem.testTargetName === row.testTargetName &&
          lastItem.viewPointName === row.viewPointName &&
          lastItem.sessionName === row.sessionName &&
          (lastItem.testPurposeValue !== row.testPurposeValue ||
            lastItem.testPurposeDetails !== row.testPurposeDetails)
        ) {
          acc.push({
            groupName: row.groupName,
            testTargetName: row.testTargetName,
            viewPointName: row.viewPointName,
            sessionName: row.sessionName,
            testPurposeValue: row.testPurposeValue,
            testPurposeDetails: row.testPurposeDetails,
          });
        }

        return acc;
      },
      []
    );

    for (const testPurposeRow of testPurposeRows) {
      report.addTestPurposeRow(testPurposeRow);
    }

    const ws2 = XLSX.utils.aoa_to_sheet([
      Object.values(report.testPurposeHeader),
    ]);

    report.testPurposeRows.forEach((row, index) => {
      XLSX.utils.sheet_add_aoa(ws2, [Object.values(row)], {
        origin: `A${index + 2}`,
      });
    });

    XLSX.utils.book_append_sheet(workbook, ws2, "TestPurposes");

    const filePath = path.join(
      outputDirectoryPath,
      `${report.sanitizeName}.xlsx`
    );

    XLSX.writeFile(workbook, filePath);
  }
}

type IssueReportRow = {
  groupName: string;
  testTargetName: string;
  viewPointName: string;
  sessionName: string;
  tester: string;
  memo: string;
  testPurposeValue: string;
  testPurposeDetails: string;
  noteValue: string;
  noteDetails: string;
  tags: string;
};

type testPurposeSheetRow = Pick<
  IssueReportRow,
  | "groupName"
  | "testTargetName"
  | "viewPointName"
  | "sessionName"
  | "testPurposeValue"
  | "testPurposeDetails"
>;

class IssueReport {
  private _name: string;

  private _header: IssueReportRow = {
    groupName: "GroupName",
    testTargetName: "TestTargetName",
    viewPointName: "ViewPointName",
    sessionName: "Session",
    tester: "Tester",
    memo: "Memo",
    testPurposeValue: "TestPurpose",
    testPurposeDetails: "TestPurposeDetail",
    noteValue: "Finding",
    noteDetails: "FindingDetail",
    tags: "Tags",
  };

  private _testPurposeHeader: testPurposeSheetRow = {
    groupName: "GroupName",
    testTargetName: "TestTargetName",
    viewPointName: "ViewPointName",
    sessionName: "Session",
    testPurposeValue: "TestPurpose",
    testPurposeDetails: "TestPurposeDetail",
  };
  private _rows: IssueReportRow[] = [];

  private _testPurposeRows: testPurposeSheetRow[] = [];

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

  get testPurposeHeader(): testPurposeSheetRow {
    return this._testPurposeHeader;
  }

  set testPurposeHeader(value: testPurposeSheetRow) {
    this._testPurposeHeader = value;
  }

  get rows(): IssueReportRow[] {
    return this._rows;
  }

  get testPurposeRows(): testPurposeSheetRow[] {
    return this._testPurposeRows;
  }

  constructor(name: string) {
    this._name = name;
  }

  public addRow(row: IssueReportRow): void {
    this._rows.push(row);
  }

  public addTestPurposeRow(row: testPurposeSheetRow): void {
    this._testPurposeRows.push(row);
  }
}
