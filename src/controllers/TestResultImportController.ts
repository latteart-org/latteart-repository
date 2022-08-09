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
import { TestStepServiceImpl } from "@/services/TestStepService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Post, Route, Body } from "tsoa";
import { screenshotDirectoryService, tempDirectoryService } from "..";
import { ImportFileRepositoryServiceImpl } from "@/services/ImportFileRepositoryService";
import { ImportService } from "@/services/ImportService";
import { TestPurposeServiceImpl } from "@/services/TestPurposeService";
import { NotesServiceImpl } from "@/services/NotesService";
import { CreateTestResultImportDto } from "../interfaces/TesResultImport";

@Route("imports/test-results")
export class TestResultImportController extends Controller {
  @Post()
  public async create(
    @Body() requestBody: CreateTestResultImportDto
  ): Promise<{ testResultId: string }> {
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

    const testStepService = new TestStepServiceImpl({
      imageFileRepository: imageFileRepositoryService,
      timestamp: timestampService,
      config: new ConfigsService(),
    });

    const noteService = new NotesServiceImpl({
      imageFileRepository: imageFileRepositoryService,
      timestamp: timestampService,
    });

    const testPurposeService = new TestPurposeServiceImpl();

    const importFileRepositoryService = new ImportFileRepositoryServiceImpl({
      staticDirectory: tempDirectoryService,
      imageFileRepository: imageFileRepositoryService,
      timestamp: timestampService,
    });

    try {
      const result = await new ImportService({
        testResult: testResultService,
        testStep: testStepService,
        testPurpose: testPurposeService,
        note: noteService,
        importFileRepository: importFileRepositoryService,
      }).importTestResult(
        requestBody.source.testResultFile,
        requestBody.dest?.testResultId ?? null
      );

      return result;
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Import test result failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.IMPORT_TEST_RESULT_FAILED,
        });
      }
      throw error;
    }
  }
}
