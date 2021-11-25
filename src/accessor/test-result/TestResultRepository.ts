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

import { DirectoryReader } from "./DirectoryReader";
import { JSONFileIO } from "./JSONFileIO";
import { TestResultIO, TestResultFileIO } from "./TestResultIO";

export type TestResultRepository = Readonly<{
  list(): Promise<TestResultIO[]>;
}>;

export class TestResultFileRepository implements TestResultRepository {
  constructor(
    private params: {
      rootDirPath: string;
      testResultFileName: string;
      directoryReader: DirectoryReader;
      jsonFileIO: JSONFileIO;
    }
  ) {}

  public async list(): Promise<TestResultIO[]> {
    const filePaths = await this.params.directoryReader.listFilePaths(
      this.params.rootDirPath,
      { filename: this.params.testResultFileName }
    );

    const testResultIOs = (
      await Promise.all(
        filePaths.map(async (filePath) => {
          const testResult = await this.params.jsonFileIO.read<{
            sessionId: string;
            name: string;
          }>(filePath);

          if (!testResult) {
            return [];
          }

          return [
            new TestResultFileIO({
              identifier: { id: testResult.sessionId, name: testResult.name },
              filePath,
              jsonFileIO: this.params.jsonFileIO,
            }),
          ];
        })
      )
    ).flat();

    return testResultIOs;
  }
}
