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

import { StaticDirectoryService } from "./StaticDirectoryService";

export class FileUploadService {
  public async upload(
    files: { filename: string; buffer: any }[],
    directoryService: StaticDirectoryService
  ): Promise<string[]> {
    const savedFiles = [];
    for (const file of files) {
      await directoryService.outputFile(file.filename, file.buffer);
      savedFiles.push(file.filename);
    }
    return savedFiles;
  }
}
