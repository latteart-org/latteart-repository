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
import { Get, Route, Path, Put, Body } from "tsoa";
import { ConfigsService } from "../services/ConfigsService";

@Route("projects/{projectId}/configs")
export class ConfigsController {
  @Get()
  public async get(@Path() projectId: string): Promise<any> {
    try {
      return new ConfigsService().getConfig(projectId);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get settings failed.", error);

        throw new ServerError(404, {
          code: ServerErrorCode.GET_SETTINGS_FAILED,
        });
      }
      throw error;
    }
  }

  @Put()
  public async update(
    @Path() projectId: string,
    @Body() requestBody: any
  ): Promise<any> {
    try {
      return new ConfigsService().updateConfig(projectId, requestBody);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Save settings failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.SAVE_SETTINGS_FAILED,
        });
      }
      throw error;
    }
  }
}
