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
import { TimestampService } from "./TimestampService";
import { ImageFileRepositoryService } from "./ImageFileRepositoryService";
import { StaticDirectoryService } from "./StaticDirectoryService";
import { readZip } from "@/lib/zipReader";

interface importProjectData {
  projectId: string;
  projectFile: { fileName: string; data: string };
  stories: {
    storyId: string;
    sessions: {
      sessionId: string;
      attachedFiles: {
        fileName: string;
        data: string;
      }[];
    }[];
  }[];
  testResults: {
    testResultId: string;
    testResultFile: { fileName: string; data: string };
    screenshots: { filePath: string; data: string }[];
  }[];
}
export interface ImportFileRepositoryService {
  importTestResult(
    importFileName: string
  ): Promise<{
    testResultFile: { fileName: string; data: string };
    screenshots: { filePath: string; data: string }[];
  }>;
}

export class ImportFileRepositoryServiceImpl
  implements ImportFileRepositoryService {
  constructor(
    private service: {
      staticDirectory: StaticDirectoryService;
      imageFileRepository: ImageFileRepositoryService;
      timestamp: TimestampService;
    }
  ) {}

  public async importTestResult(
    importFileName: string
  ): Promise<{
    testResultFile: { fileName: string; data: string };
    screenshots: { filePath: string; data: string }[];
  }> {
    const importFilePath = this.service.staticDirectory.getJoinedPath(
      path.basename(importFileName)
    );

    const files = await readZip(importFilePath);

    const testResultFile = files.find((file) => file.filePath === "log.json");

    if (!testResultFile || typeof testResultFile.data !== "string") {
      throw Error("Invalid test result file.");
    }

    const screenshots = files
      .filter((file) => [".png", ".webp"].includes(path.extname(file.filePath)))
      .map((file) => {
        return {
          filePath: file.filePath,
          data:
            typeof file.data !== "string" ? file.data.toString("base64") : "",
        };
      });

    return {
      testResultFile: {
        fileName: testResultFile.filePath,
        data: testResultFile.data,
      },
      screenshots,
    };
  }
}
