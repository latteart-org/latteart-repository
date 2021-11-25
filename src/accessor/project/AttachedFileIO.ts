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
 * Class to read and write story attachments.
 */
export default class AttachedFileIO {
  private outputDirPath: string;

  /**
   * constructor
   * @param sessionDirPath  Path to save test results
   */
  constructor(sessionDirPath: string) {
    this.outputDirPath = path.join(sessionDirPath, "attached");
  }

  /**
   * Decode and save a base64-encoded attachment.
   * @param id  Test result id
   * @param name  Attachment name
   * @param base64FileData  Base64-encoded attachment string
   * @returns Path of saved attachment
   */
  public async addAttachedFile(
    id: string,
    name: string,
    base64FileData: string
  ): Promise<string> {
    const destFilePath = path.join(this.outputDirPath, id + "_" + name);

    const decode = Buffer.from(base64FileData, "base64");
    fs.outputFileSync(destFilePath, decode);

    return destFilePath;
  }

  /**
   * Delete an attachment
   * @param filename  Attachment name to delete
   */
  public async deleteAttachedFile(filename: string): Promise<void> {
    await fs.remove(path.join(this.outputDirPath, filename));
  }
}
