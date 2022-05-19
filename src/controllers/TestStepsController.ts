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
import { ServerErrorCode, ServerError } from "@/ServerError";
import { ConfigsService } from "@/services/ConfigsService";
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Get, Post, Patch, Route, Path, Body } from "tsoa";
import { screenshotDirectoryService } from "..";
import {
  PatchTestStepDto,
  CreateTestStepDto,
  GetTestStepResponse,
  CreateTestStepResponse,
  PatchTestStepResponse,
} from "../interfaces/TestSteps";

@Route("test-results/{testResultId}/test-steps")
export class TestStepsController extends Controller {
  @Post()
  public async create(
    @Path() testResultId: string,
    @Body() requestBody: CreateTestStepDto
  ): Promise<CreateTestStepResponse> {
    console.log("TestStepsController - createTestStep");

    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    try {
      return await new TestStepServiceImpl({
        imageFileRepository: imageFileRepositoryService,
        timestamp: new TimestampServiceImpl(),
        config: new ConfigsService(),
      }).createTestStep(testResultId, requestBody);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Add test step failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.ADD_TEST_STEP_FAILED,
        });
      }
      throw error;
    }
  }

  @Get("{testStepId}")
  public async get(
    @Path() testResultId: string,
    @Path() testStepId: string
  ): Promise<GetTestStepResponse> {
    console.log("TestStepsController - getTestStep");

    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    const testStepService = new TestStepServiceImpl({
      imageFileRepository: imageFileRepositoryService,
      timestamp: new TimestampServiceImpl(),
      config: new ConfigsService(),
    });

    try {
      const testStep = await testStepService.getTestStep(testStepId);

      return testStep;
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get test step failed.", error);

        throw new ServerError(404, {
          code: ServerErrorCode.GET_TEST_STEP_FAILED,
        });
      }
      throw error;
    }
  }

  @Patch("{testStepId}")
  public async patch(
    @Path() testResultId: string,
    @Path() testStepId: string,
    @Body() requestBody: PatchTestStepDto
  ): Promise<PatchTestStepResponse> {
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    const testStepService = new TestStepServiceImpl({
      imageFileRepository: imageFileRepositoryService,
      timestamp: new TimestampServiceImpl(),
      config: new ConfigsService(),
    });

    try {
      if (requestBody.notices) {
        console.log("TestStepsController - attachNotesToTestStep");

        await testStepService.attachNotesToTestStep(
          testStepId,
          requestBody.notices
        );
      }

      if (requestBody.intention !== undefined) {
        console.log("TestStepsController - attachTestPurposeToTestStep");

        await testStepService.attachTestPurposeToTestStep(
          testStepId,
          requestBody.intention
        );
      }

      const testStep = await testStepService.getTestStep(testStepId);

      return testStep;
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Edit test step failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.EDIT_TEST_STEP_FAILED,
        });
      }
      throw error;
    }
  }
}
