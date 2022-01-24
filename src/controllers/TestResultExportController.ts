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
import { ConfigsService } from "@/services/ConfigsService";
import { ExportServiceImpl } from "@/services/ExportService";
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { TestResultServiceImpl } from "@/services/TestResultService";
import { ExportFileRepositoryServiceImpl } from "@/services/ExportFileRepositoryService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Post, Route, Path } from "tsoa";
import { exportDirectoryService, screenshotDirectoryService } from "..";

@Route("test-results/{testResultId}/export")
export class TestResultExportController extends Controller {
  @Post()
  public async create(@Path() testResultId: string): Promise<{ url: string }> {
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

    const exportFileRepositoryService = new ExportFileRepositoryServiceImpl({
      staticDirectory: exportDirectoryService,
      imageFileRepository: imageFileRepositoryService,
      timestamp: timestampService,
    });

    try {
      return await new ExportServiceImpl({
        testResult: testResultService,
        exportFileRepository: exportFileRepositoryService,
      }).exportTestResult(testResultId);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Export test result failed.", error);
        throw new ServerError(500, {
          code: ServerErrorCode.EXPORT_TEST_RESULT_FAILED,
        });
      }
      throw error;
    }
  }
}
