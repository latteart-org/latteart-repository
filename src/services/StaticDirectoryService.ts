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

export interface StaticDirectoryService {
  outputFile<T>(relativePathToRoot: string, data: T): Promise<void>;

  removeFile(relativePathToRoot: string): Promise<void>;

  getFileUrl(relativePathToRoot: string): string;

  getJoinedPath(relativePathToRoot: string): string;

  moveFile(
    sourceFilePath: string,
    destRelativePathToRoot: string
  ): Promise<void>;
}

export class StaticDirectoryServiceImpl implements StaticDirectoryService {
  constructor(private rootDirectoryPath: string) {}

  public async outputFile<T>(
    relativePathToRoot: string,
    data: T
  ): Promise<void> {
    await fs.outputFile(
      path.join(this.rootDirectoryPath, relativePathToRoot),
      data
    );
  }

  public async removeFile(relativePathToRoot: string): Promise<void> {
    await fs.remove(path.join(this.rootDirectoryPath, relativePathToRoot));
  }

  public getFileUrl(relativePathToRoot: string): string {
    const filePath = path.join(this.rootDirectoryPath, relativePathToRoot);

    return `${filePath.split(path.sep).slice(1).join("/")}`;
  }

  public getJoinedPath(relativePathToRoot: string): string {
    return path.join(this.rootDirectoryPath, relativePathToRoot);
  }

  public async moveFile(
    sourceFilePath: string,
    destRelativePathToRoot: string
  ): Promise<void> {
    const destFilePath = path.join(
      this.rootDirectoryPath,
      destRelativePathToRoot
    );

    await fs.mkdirp(path.dirname(destFilePath));
    await fs.copyFile(sourceFilePath, destFilePath);
    await fs.remove(sourceFilePath);
  }
}
