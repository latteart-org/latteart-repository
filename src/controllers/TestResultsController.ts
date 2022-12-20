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

import { ListSessionResponse } from "../interfaces/Sessions";
import LoggingService from "@/logger/LoggingService";
import { ServerErrorCode, ServerError } from "@/ServerError";
import { ConfigsService } from "@/services/ConfigsService";
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { SessionsService } from "@/services/SessionsService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Get, Post, Patch, Route, Path, Body, Delete } from "tsoa";
import { screenshotDirectoryService, transactionRunner } from "..";
import {
  ListTestResultResponse,
  CreateTestResultResponse,
  GetTestResultResponse,
  PatchTestResultResponse,
  CreateTestResultDto,
} from "../interfaces/TestResults";
import { TestResultServiceImpl } from "../services/TestResultService";

@Route("test-results")
export class TestResultsController extends Controller {
  /**
   * テスト結果一覧を取得する
   * @returns テスト結果一覧
   */
  @Get()
  public async list(): Promise<ListTestResultResponse[]> {
    console.log("TestResultsController - getTestResults");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    return new TestResultServiceImpl({
      timestamp: timestampService,
      testStep: new TestStepServiceImpl({
        imageFileRepository: imageFileRepositoryService,
        timestamp: timestampService,
        config: new ConfigsService(),
      }),
    }).getTestResultIdentifiers();
  }

  /**
   * テスト結果を取得する
   * @param testResultId 対象のテスト結果ID
   * @returns テスト結果
   */
  @Get("{testResultId}")
  public async get(
    @Path() testResultId: string
  ): Promise<GetTestResultResponse> {
    console.log("TestResultsController - getTestResult");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    try {
      const testResult = await new TestResultServiceImpl({
        timestamp: timestampService,
        testStep: new TestStepServiceImpl({
          imageFileRepository: imageFileRepositoryService,
          timestamp: timestampService,
          config: new ConfigsService(),
        }),
      }).getTestResult(testResultId);

      if (testResult) {
        return testResult;
      }
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get test result failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.GET_TEST_RESULT_FAILED,
        });
      }
      throw error;
    }

    LoggingService.error(
      `Test result not found. testResultId: ${testResultId}`
    );

    throw new ServerError(404, {
      code: ServerErrorCode.GET_TEST_RESULT_FAILED,
    });
  }

  /**
   * テスト結果を作成する
   * @param requestBody テスト対象URL・テスト結果名・テスト開始日時
   * @returns 作成したテスト結果ID・テスト結果名
   */
  @Post()
  public async create(
    @Body() requestBody: CreateTestResultDto
  ): Promise<CreateTestResultResponse> {
    console.log("TestResultsController - create");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    try {
      const result = await new TestResultServiceImpl({
        timestamp: timestampService,
        testStep: new TestStepServiceImpl({
          imageFileRepository: imageFileRepositoryService,
          timestamp: timestampService,
          config: new ConfigsService(),
        }),
      }).createTestResult(requestBody, null);

      return result;
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Create test result failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.CREATE_TEST_RESULT_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * テスト結果を指定のものに更新する
   * @param testResultId 対象のテスト結果ID
   * @param requestBody テスト結果名・テスト開始日時・テスト対象URL
   * @returns 更新後のテスト結果
   */
  @Patch("{testResultId}")
  public async patch(
    @Path() testResultId: string,
    @Body()
    requestBody: { name?: string; startTime?: number; initialUrl?: string }
  ): Promise<PatchTestResultResponse> {
    console.log("TestResultsController - patchTestResult");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    try {
      return await new TestResultServiceImpl({
        timestamp: timestampService,
        testStep: new TestStepServiceImpl({
          imageFileRepository: imageFileRepositoryService,
          timestamp: timestampService,
          config: new ConfigsService(),
        }),
      }).patchTestResult({
        id: testResultId,
        ...requestBody,
      });
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Update test result failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.UPDATE_TEST_RESULT_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * テスト結果を削除する
   * @param testResultId 対象のテスト結果ID
   * @returns なし
   */
  @Delete("{testResultId}")
  public async delete(@Path() testResultId: string): Promise<void> {
    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });
    const service = new TestResultServiceImpl({
      timestamp: timestampService,
      testStep: new TestStepServiceImpl({
        imageFileRepository: imageFileRepositoryService,
        timestamp: timestampService,
        config: new ConfigsService(),
      }),
    });

    try {
      return await service.deleteTestResult(
        testResultId,
        transactionRunner,
        screenshotDirectoryService
      );
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Delete test result failed.", error);
        throw new ServerError(500, {
          code: ServerErrorCode.DELETE_TEST_RESULT_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * テスト結果に紐づくセッションIDを取得する
   * @param testResultId 対象のテスト結果ID
   * @returns テスト結果に紐づくセッションID
   */
  @Get("{testResultId}/sessions")
  public async getSessionList(
    @Path() testResultId: string
  ): Promise<ListSessionResponse> {
    console.log("TestResultsController - getSessionIds");

    return new SessionsService().getSessionIdentifiers(testResultId);
  }
}
