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

import { CreateProjectExportDto } from "../interfaces/ProjectExport";
import LoggingService from "@/logger/LoggingService";
import { ServerError, ServerErrorCode } from "@/ServerError";
import { ProjectExportService } from "@/services/ProjectExportService";

import { Body, Controller, Path, Post, Route } from "tsoa";
import {
  exportDirectoryService,
  screenshotDirectoryService,
  transactionRunner,
} from "..";
import { ExportServiceImpl } from "@/services/ExportService";
import { TestResultServiceImpl } from "@/services/TestResultService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { ConfigsService } from "@/services/ConfigsService";
import { ExportFileRepositoryServiceImpl } from "@/services/ExportFileRepositoryService";
import { ProjectsServiceImpl } from "@/services/ProjectsService";
import { TestProgressServiceImpl } from "@/services/TestProgressService";

@Route("projects/{projectId}/export")
export class ProjectExportController extends Controller {
  /**
   * プロジェクト情報とテスト結果情報をエクスポートする
   * @param projectId 対象のプロジェクトID
   * @param requestBody エクスポート対象のフラグ
   * @returns エクスポートしたプロジェクト情報・テスト結果情報のダウンロードURL
   */
  @Post()
  public async create(
    @Path() projectId: string,
    @Body() requestBody: CreateProjectExportDto
  ): Promise<{ url: string }> {
    try {
      const timestampService = new TimestampServiceImpl();
      const screenshotFileRepositoryService =
        new ImageFileRepositoryServiceImpl({
          staticDirectory: screenshotDirectoryService,
        });
      const exportFileRepositoryService = new ExportFileRepositoryServiceImpl({
        staticDirectory: exportDirectoryService,
        imageFileRepository: screenshotFileRepositoryService,
        timestamp: timestampService,
      });
      const testResultService = new TestResultServiceImpl({
        timestamp: timestampService,
        testStep: new TestStepServiceImpl({
          imageFileRepository: screenshotFileRepositoryService,
          timestamp: timestampService,
          config: new ConfigsService(),
        }),
      });
      const exportService = new ExportServiceImpl({
        testResult: testResultService,
        exportFileRepository: exportFileRepositoryService,
      });

      const testProgressService = new TestProgressServiceImpl(
        transactionRunner
      );

      const projectService = new ProjectsServiceImpl(
        {
          timestamp: timestampService,
          testProgress: testProgressService,
        },
        transactionRunner
      );

      const url = await new ProjectExportService().export(
        projectId,
        requestBody.includeProject,
        requestBody.includeTestResults,
        {
          projectService,
          testResultService,
          exportService,
          exportFileRepositoryService,
          testProgressService,
        }
      );
      return {
        url,
      };
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Export project failed.", error);
        throw new ServerError(500, {
          code: ServerErrorCode.EXPORT_PROJECT_FAILED,
        });
      }
      throw error;
    }
  }
}
