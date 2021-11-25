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

import path from "path";
import fs from "fs-extra";
import glob from "glob";

/**
 * Class that inputs and outputs test results.
 */
export default class TestResultIO {
  private outputDirPath: string;
  private isCanceled: () => boolean;

  /**
   * constructor
   * @param sessionDirPath  The path of the directory where the session information is stored
   * @param isCanceled  The function that returns whether saving was canceled or not
   */
  constructor(sessionDirPath: string, isCanceled?: () => boolean) {
    this.outputDirPath = path.join(sessionDirPath, "testResult");
    this.isCanceled = isCanceled ?? (() => false);
  }

  /**
   * Add a test result.
   * @param sourceFilePath  Test result file path
   */
  public async addTestResult(
    sourceFilePath: string
  ): Promise<{
    canceled: boolean;
    addedTestResultFilePath: string;
  }> {
    await fs.mkdirs(this.outputDirPath);
    const dirPath = path.dirname(sourceFilePath);

    const filepaths = await new Promise<string[]>((resolve, reject) => {
      glob(`${dirPath}/**/*`, (error, files) => {
        if (error) {
          reject(error);
        }
        resolve(files);
      });
    });
    for (const filepath of filepaths) {
      if (this.isCanceled()) {
        return {
          canceled: true,
          addedTestResultFilePath: path.join(
            this.outputDirPath,
            path.basename(sourceFilePath)
          ),
        };
      }

      const destPath = path.join(
        this.outputDirPath,
        path.relative(dirPath, filepath)
      );

      await fs.copy(filepath, destPath);
    }

    return {
      canceled: false,
      addedTestResultFilePath: path.join(
        this.outputDirPath,
        path.basename(sourceFilePath)
      ),
    };
  }

  /**
   * Delete a test result.
   */
  public async deleteTestResult(): Promise<void> {
    await fs.remove(this.outputDirPath);
  }
}
