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

import {
  GetTestTargetResponse,
  PatchTestTargetResponse,
  PostTestTargetResponse,
} from "../interfaces/TestTargets";
import LoggingService from "@/logger/LoggingService";
import { ServerError, ServerErrorCode } from "@/ServerError";
import { TestTargetService } from "@/services/TestTargetsService";
import { Controller, Body, Patch, Route, Path, Get, Post, Delete } from "tsoa";
import { transactionRunner } from "..";

@Route("projects/{projectId}/test-targets/")
export class TestTargetsController extends Controller {
  /**
   * テストターゲットを取得する
   * @param projectId 対象のプロジェクトID
   * @param testTargetId 対象のテストターゲットID
   * @returns テストターゲット
   */
  @Get("{testTargetId}")
  public async get(
    @Path() projectId: string,
    @Path() testTargetId: string
  ): Promise<GetTestTargetResponse> {
    try {
      return await new TestTargetService().get(testTargetId);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get testTarget failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.GET_TEST_TARGET_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * テストターゲットを作成する
   * @param projectId 対象のプロジェクトID
   * @param body 対象のテストターゲットグループID・テストターゲット名
   * @returns 作成したテストターゲット
   */
  @Post()
  public async post(
    @Path() projectId: string,
    @Body() body: { testTargetGroupId: string; name: string }
  ): Promise<PostTestTargetResponse> {
    try {
      return await new TestTargetService().post(body, transactionRunner);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Post testTarget failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.POST_TEST_TARGET_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * テストターゲットを指定したものに更新する
   * @param projectId 対象のプロジェクトID
   * @param testTargetId 対象のテストターゲットID
   * @param body テストターゲット名・テストターゲットインデックス・テスト計画
   * @returns 更新後のテストターゲット
   */
  @Patch("{testTargetId}")
  public async patch(
    @Path() projectId: string,
    @Path() testTargetId: string,
    @Body()
    body: {
      name?: string;
      index?: number;
      plans?: { viewPointId: string; value: number }[];
    }
  ): Promise<PatchTestTargetResponse> {
    try {
      return await new TestTargetService().patch(
        projectId,
        testTargetId,
        body,
        transactionRunner
      );
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Patch testTarget failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.PATCH_TEST_TARGET_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * テストターゲットを削除する
   * @param projectId 対象のプロジェクトID
   * @param testTargetId 対象のテストターゲット
   * @returns なし
   */
  @Delete("{testTargetId}")
  public async delete(
    @Path() projectId: string,
    @Path() testTargetId: string
  ): Promise<void> {
    try {
      return await new TestTargetService().delete(
        testTargetId,
        transactionRunner
      );
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Delete testTarget failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.DELETE_TEST_TARGET_FAILED,
        });
      }
      throw error;
    }
  }
}
