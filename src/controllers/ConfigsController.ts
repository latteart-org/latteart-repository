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

import {
  GetConfigResponse,
  PutConfigDto,
  PutConfigResponse,
} from "../interfaces/Configs";
import LoggingService from "@/logger/LoggingService";
import { ServerError, ServerErrorCode } from "@/ServerError";
import { Get, Route, Path, Put, Body } from "tsoa";
import { ConfigsService } from "../services/ConfigsService";
import { convertToExportableConfig } from "@/lib/settings/settingsConverter";

@Route("projects/{projectId}/configs")
export class ConfigsController {
  /**
   * プロジェクトの設定を取得する
   * @param projectId 対象のプロジェクトID
   * @returns プロジェクトの設定
   */
  @Get()
  public async get(@Path() projectId: string): Promise<GetConfigResponse> {
    try {
      const config = await new ConfigsService().getConfig(projectId);
      return convertToExportableConfig(config);
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

  /**
   * プロジェクトの設定を指定のものに更新する
   * @param projectId 対象のプロジェクトID
   * @param requestBody 設定
   * @returns 更新後の設定
   */
  @Put()
  public async update(
    @Path() projectId: string,
    @Body() requestBody: PutConfigDto
  ): Promise<PutConfigResponse> {
    try {
      const config = await new ConfigsService().updateConfig(
        projectId,
        requestBody
      );
      return convertToExportableConfig(config);
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
