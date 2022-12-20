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
import { Get, Route, Path, Put, Body } from "tsoa";
import { ConfigsService } from "../services/ConfigsService";

@Route("projects/{projectId}/device-configs")
export class DeviceConfigsController {
  /**
   * プロジェクトのデバイス設定を取得する
   * @param projectId 対象のプロジェクトID
   * @returns プロジェクトのデバイス設定
   */
  @Get()
  public async get(@Path() projectId: string): Promise<any> {
    try {
      return new ConfigsService().getDeviceConfig(projectId);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get device settings failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.GET_DEVICE_SETTINGS_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * プロジェクトのデバイス設定を指定のものに更新する
   * @param projectId 対象のプロジェクトID
   * @param requestBody デバイス設定
   * @returns 更新後のデバイス設定
   */
  @Put()
  public async update(
    @Path() projectId: string,
    @Body() requestBody: any
  ): Promise<any> {
    try {
      return new ConfigsService().updateDeviceConfig(projectId, requestBody);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Save device settings failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.SAVE_DEVICE_SETTINGS_FAILED,
        });
      }
      throw error;
    }
  }
}
