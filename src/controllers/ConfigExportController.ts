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
import { ConfigsService } from "@/services/ConfigsService";

import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Post, Route, Path } from "tsoa";
import { exportDirectoryService } from "..";
import { ConfigExportService } from "@/services/ConfigExportService";

@Route("projects/{projectId}/configs/export")
export class ConfigExportController extends Controller {
  /**
   * プロジェクトの設定をエクスポートする
   * @param projectId 対象のプロジェクトID
   * @returns エクスポートした設定ファイルのダウンロードURL
   */
  @Post()
  public async create(@Path() projectId: string): Promise<{ url: string }> {
    const result = await new ConfigExportService().export(projectId, {
      configService: new ConfigsService(),
      timestampService: new TimestampServiceImpl(),
      tempDirectoryService: exportDirectoryService,
    });

    try {
      return { url: result };
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Export config failed.", error);
        throw new ServerError(500, {
          code: ServerErrorCode.EXPORT_CONFIG_FAILED,
        });
      }
      throw error;
    }
  }
}
