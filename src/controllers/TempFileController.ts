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

import LoggingService from "@/logger/LoggingService";
import { ServerError, ServerErrorCode } from "@/ServerError";
import { TempFileService } from "@/services/TempFileService";
import { Controller, Route, Path, Delete } from "tsoa";
import { tempDirectoryService } from "..";

@Route("temp")
export class TempFileController extends Controller {
  @Delete("{fileName}")
  public async delete(@Path() fileName: string): Promise<void> {
    try {
      new TempFileService().deleteFile(fileName, tempDirectoryService);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Delete tempfile failed.", error);
        throw new ServerError(500, {
          code: ServerErrorCode.TEMP_DELETE_FAILD,
        });
      }
      throw error;
    }
  }
}