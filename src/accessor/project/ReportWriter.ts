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
import Report from "./Report";

/**
 * Class that outputs a report.
 */
export default class ReportWriter {
  /**
   * Output report.
   * @param filePath  File path to output
   * @param report  Report information
   */
  public write(filePath: string, report: Report): void {
    const workbook = XLSX.utils.book_new();

    const ws = XLSX.utils.aoa_to_sheet([Object.values(report.header)]);

    report.rows.forEach((row, index) => {
      XLSX.utils.sheet_add_aoa(ws, [Object.values(row)], {
        origin: `A${index + 2}`,
      });
    });

    XLSX.utils.book_append_sheet(workbook, ws, "Sheet");

    XLSX.writeFile(workbook, filePath);
  }
}
