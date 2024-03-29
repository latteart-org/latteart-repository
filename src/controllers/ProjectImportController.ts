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

import { Body, Controller, Post, Route } from "tsoa";
import {
  attachedFileDirectoryService,
  screenshotDirectoryService,
  tempDirectoryService,
  transactionRunner,
} from "..";
import { ProjectImportService } from "@/services/ProjectImportService";
import { CreateProjectImportDto } from "../interfaces/ProjectImport";
import LoggingService from "@/logger/LoggingService";
import { ServerError, ServerErrorCode } from "@/ServerError";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { TestResultServiceImpl } from "@/services/TestResultService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { ConfigsService } from "@/services/ConfigsService";
import { NotesServiceImpl } from "@/services/NotesService";
import { TestPurposeServiceImpl } from "@/services/TestPurposeService";
import { TestResultImportService } from "@/services/TestResultImportService";
import { ImportFileRepositoryServiceImpl } from "@/services/ImportFileRepositoryService";

@Route("imports/projects")
export class ProjectImportController extends Controller {
  @Post()
  public async create(
    @Body() requestBody: CreateProjectImportDto
  ): Promise<{ projectId: string }> {
    try {
      const timestampService = new TimestampServiceImpl();

      const screenshotRepositoryService = new ImageFileRepositoryServiceImpl({
        staticDirectory: screenshotDirectoryService,
      });
      const attachedFileRepositoryService = new ImageFileRepositoryServiceImpl({
        staticDirectory: attachedFileDirectoryService,
      });
      const importDirectoryRepositoryService =
        new ImageFileRepositoryServiceImpl({
          staticDirectory: tempDirectoryService,
        });
      const configService = new ConfigsService();
      const testStepService = new TestStepServiceImpl({
        imageFileRepository: screenshotRepositoryService,
        timestamp: timestampService,
        config: configService,
      });

      const testResultService = new TestResultServiceImpl({
        timestamp: timestampService,
        testStep: testStepService,
      });
      const notesService = new NotesServiceImpl({
        imageFileRepository: screenshotRepositoryService,
        timestamp: timestampService,
      });

      const testPurposeService = new TestPurposeServiceImpl();

      const response = await new ProjectImportService().import(
        requestBody.source.projectFile,
        requestBody.includeProject,
        requestBody.includeTestResults,
        {
          timestampService,
          testResultService,
          testStepService,
          screenshotRepositoryService,
          attachedFileRepositoryService,
          importDirectoryRepositoryService,
          importDirectoryService: tempDirectoryService,
          notesService,
          testPurposeService,
          transactionRunner,
        }
      );

      return response;
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Import project failed.", error);
        if (error.message === "Test result information does not exist.") {
          throw new ServerError(500, {
            code: ServerErrorCode.IMPORT_TEST_RESULT_NOT_EXIST,
          });
        }
        if (error.message === "Project information does not exist.") {
          throw new ServerError(500, {
            code: ServerErrorCode.IMPORT_PROJECT_NOT_EXIST,
          });
        }
        throw new ServerError(500, {
          code: ServerErrorCode.IMPORT_PROJECT_FAILED,
        });
      }
      throw error;
    }
  }
}
