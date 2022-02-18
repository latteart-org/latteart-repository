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
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { TestResultServiceImpl } from "@/services/TestResultService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Post, Route, Get, Body } from "tsoa";
import {
  importDirectoryService,
  screenshotDirectoryService,
  tempDirectoryService,
} from "..";
import { ImportFileRepositoryServiceImpl } from "@/services/ImportFileRepositoryService";
import { ImportService } from "@/services/ImportService";
import { TestPurposeServiceImpl } from "@/services/TestPurposeService";
import { NotesServiceImpl } from "@/services/NotesService";
import path from "path";
import { isTestResultExportFile } from "@/lib/archiveFileTypeChecker";
import { CreateTestResultImportDto } from "../interfaces/TesResultImport";
import { downloadZip } from "@/lib/Request";

@Route("imports/test-results")
export class TestResultImportController extends Controller {
  @Get()
  public async list(): Promise<
    {
      id: string;
      name: string;
    }[]
  > {
    const zipFilePaths = await importDirectoryService.collectFilePaths(
      /^.+\.zip$/
    );

    return (
      await Promise.all(
        zipFilePaths.map(async (zipFilePath) => {
          const filename = path.basename(zipFilePath);

          return (await isTestResultExportFile(zipFilePath))
            ? [{ id: filename, name: filename }]
            : [];
        })
      )
    ).flat();
  }

  @Post()
  public async create(
    @Body() requestBody: CreateTestResultImportDto
  ): Promise<{ testResultId: string }> {
    if (requestBody?.repositoryUrl) {
      await downloadZip(
        `${requestBody.repositoryUrl}/${requestBody.temp ? "temp" : "import"}/${
          requestBody.fileName
        }`,
        tempDirectoryService.getJoinedPath(requestBody.fileName)
      );
    }

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
      staticDirectory: requestBody?.temp
        ? tempDirectoryService
        : importDirectoryService,
      imageFileRepository: imageFileRepositoryService,
      timestamp: timestampService,
    });

    try {
      return await new ImportService({
        testResult: testResultService,
        testStep: testStepService,
        testPurpose: testPurposeService,
        note: noteService,
        importFileRepository: importFileRepositoryService,
      }).importTestResult(
        requestBody.fileName,
        requestBody?.testResultId ?? null
      );
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
