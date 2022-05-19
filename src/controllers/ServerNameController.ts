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

import LoggingService from "@/logger/LoggingService";
import { ServerError, ServerErrorCode } from "@/ServerError";
import { Get, Route } from "tsoa";
import { ServerNameService } from "../services/ServerNameService";

@Route("server-name")
export class ServerNameController {
  @Get()
  public async get(): Promise<string> {
    try {
      return new ServerNameService().getServerName();
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get server name failed.", error);

        throw new ServerError(404, {
          code: ServerErrorCode.GET_SERVERNAME_FAILED,
        });
      }
      throw error;
    }
  }
}
