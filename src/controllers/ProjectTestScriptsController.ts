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
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { TestResultServiceImpl } from "@/services/TestResultService";
import { TestScriptJSDocRenderingService } from "@/services/testScriptDocRendering/TestScriptJSDocRenderingService";
import { TestScriptFileRepositoryServiceImpl } from "@/services/TestScriptFileRepositoryService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Post, Route, Path, Body } from "tsoa";
import { screenshotDirectoryService, testScriptDirectoryService } from "..";
import { CreateTestScriptDto } from "../interfaces/TestScripts";
import { TestScriptsService } from "../services/TestScriptsService";

@Route("projects/{projectId}/test-scripts")
export class ProjectTestScriptsController extends Controller {
  /**
   * テストスクリプトを出力する
   * @param projectId 対象のプロジェクトID
   * @param requestBody テストスクリプト作成条件
   * @returns 出力したテストスクリプトファイルのダウンロードURLと無効な操作タイプの存在フラグ
   */
  @Post()
  public async create(
    @Path() projectId: string,
    @Body() requestBody: CreateTestScriptDto
  ): Promise<{ url: string; invalidOperationTypeExists: boolean }> {
    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    const testResultService = new TestResultServiceImpl({
      timestamp: timestampService,
      testStep: new TestStepServiceImpl({
        imageFileRepository: imageFileRepositoryService,
        timestamp: timestampService,
        config: new ConfigsService(),
      }),
    });

    const testScriptFileRepositoryService =
      new TestScriptFileRepositoryServiceImpl({
        staticDirectory: testScriptDirectoryService,
        testScriptDocRendering: new TestScriptJSDocRenderingService(),
        imageFileRepository: imageFileRepositoryService,
        timestamp: timestampService,
      });

    try {
      return await new TestScriptsService({
        testResult: testResultService,
        testScriptFileRepository: testScriptFileRepositoryService,
      }).createTestScriptByProject(projectId, requestBody);
    } catch (error) {
      if (error instanceof ServerError) {
        throw error;
      }

      if (error instanceof Error) {
        LoggingService.error("Save test script failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.SAVE_TEST_SCRIPT_FAILED,
        });
      }

      throw error;
    }
  }
}
