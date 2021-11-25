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

/**
 * Service that handles TestScript.
 */
export default class TestScriptRepositoryService {
  private outputDirPath: string;

  /**
   * constructor
   * @param outputDirPath  TestScript output path
   */
  constructor(outputDirPath: string) {
    this.outputDirPath = outputDirPath;
  }

  /**
   * Save the test script.
   * @param testScripts.pageObjects  Page object
   * @param testScripts.testSuite  Test suite
   * @param timestamp  Save time
   * @returns Test script storage information
   */
  public async saveTestScripts(
    testScripts: {
      pageObjects: Array<{ name: string; script: string }>;
      testData: Array<{ name: string; testData: string }>;
      testSuite?: { name: string; spec: string };
      others?: { name: string; script: string }[];
    },
    timestamp: string
  ): Promise<{
    testScripts: {
      pageObjects: Array<{
        name: string;
        script: string;
      }>;
      testData: Array<{
        name: string;
        testData: string;
      }>;
      testSuite?:
        | {
            name: string;
            spec: string;
          }
        | undefined;
      others?: { name: string; script: string }[];
    };
    path: string;
  }> {
    const tsDirPath = path.join(
      ".",
      this.outputDirPath,
      `test_script_${timestamp}`
    );

    await Promise.all(
      testScripts.pageObjects.map((po) => {
        const poDirPath = path.resolve(tsDirPath, "page_objects");
        const saveFilePath = path.resolve(poDirPath, po.name);
        return fs.outputFile(saveFilePath, po.script);
      })
    );

    await Promise.all(
      testScripts.testData.map((testData) => {
        const testDataDirPath = path.resolve(tsDirPath, "test_data");
        const saveFilePath = path.resolve(testDataDirPath, testData.name);
        return fs.outputFile(saveFilePath, testData.testData);
      })
    );

    if (testScripts.testSuite) {
      const saveFilePath = path.resolve(tsDirPath, testScripts.testSuite.name);
      await fs.outputFile(saveFilePath, testScripts.testSuite.spec);
    }

    for (const other of testScripts.others ?? []) {
      await fs.outputFile(path.resolve(tsDirPath, other.name), other.script);
    }

    return {
      testScripts,
      path: tsDirPath,
    };
  }
}
