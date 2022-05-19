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

import { readZip } from "./zipReader";
import path from "path";

export async function isProjectExportFile(
  archiveFilePath: string
): Promise<boolean> {
  const archiveFiles = await readZip(archiveFilePath);

  return archiveFiles.every((archiveFile) => {
    const pathElements = archiveFile.filePath.split("/");

    if (pathElements.length <= 1) {
      return false;
    }

    return ["test-results", "projects"].includes(pathElements[0]);
  });
}

export async function isTestResultExportFile(
  archiveFilePath: string
): Promise<boolean> {
  const archiveFiles = await readZip(archiveFilePath);

  return archiveFiles.every((archiveFile) => {
    const pathElements = archiveFile.filePath.split("/");

    if (pathElements.length !== 1) {
      return false;
    }

    const fileName = pathElements[0];

    return (
      fileName === "log.json" ||
      [".png", ".webp"].includes(path.extname(fileName))
    );
  });
}
