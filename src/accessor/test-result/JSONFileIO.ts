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

import LoggingService from "../../logger/LoggingService";
import fs from "fs-extra";

export type JSONFileReader = Readonly<{
  read<T>(filePath: string): Promise<T | null>;
}>;

export type JSONFileWriter = Readonly<{
  write<T>(filePath: string, data: T): Promise<void>;
}>;

export type JSONFileIO = JSONFileReader & JSONFileWriter;

export class JSONFileIOImpl implements JSONFileIO {
  private static encoding = "utf8";

  public async read<T>(filePath: string): Promise<T | null> {
    return await fs
      .readJSON(filePath, { encoding: JSONFileIOImpl.encoding })
      .catch((error) => {
        LoggingService.warn(error);

        return null;
      });
  }

  public async write<T>(filePath: string, data: T): Promise<void> {
    return await fs
      .outputJSON(filePath, data, { encoding: JSONFileIOImpl.encoding })
      .catch((error) => {
        LoggingService.warn(error);
      });
  }
}
