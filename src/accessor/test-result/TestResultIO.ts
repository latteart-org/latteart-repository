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

import { JSONFileIO } from "./JSONFileIO";
import { Note } from "./Note";
import { CoverageSource, InputElementInfo } from "./types";

export type TestResult = Readonly<{
  name: string;
  sessionId: string;
  sequence: number;
  startTimeStamp: number;
  endTimeStamp: number;
  initialUrl: string;
  history: {
    [key: number]: {
      testStep: any | null;
      intention: string | null;
      bugs: string[];
      notices: string[];
    };
  };
  notes: Note[];
  coverageSources: CoverageSource[];
  inputElementInfos: InputElementInfo[];
}>;

export type TestResultReader = Readonly<{
  read(): Promise<TestResult | null>;
}>;

export type TestResultWriter = Readonly<{
  write(testResult: TestResult): Promise<void>;
}>;

export type TestResultIdentifier = Readonly<{
  id: string;
  name: string;
}>;

export interface TestResultIO extends TestResultReader, TestResultWriter {
  readonly identifier: TestResultIdentifier;
}

export class TestResultFileIO implements TestResultIO {
  constructor(
    private params: {
      identifier: TestResultIdentifier;
      filePath: string;
      jsonFileIO: JSONFileIO;
    }
  ) {}

  public get identifier(): TestResultIdentifier {
    return this.params.identifier;
  }

  public read(): Promise<TestResult | null> {
    return this.params.jsonFileIO.read<TestResult>(this.params.filePath);
  }

  public write(testResult: TestResult): Promise<void> {
    return this.params.jsonFileIO.write<TestResult>(
      this.params.filePath,
      testResult
    );
  }
}
