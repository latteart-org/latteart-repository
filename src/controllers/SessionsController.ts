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
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Body, Patch, Route, Path, Post, Delete } from "tsoa";
import { attachedFileDirectoryService, transactionRunner } from "..";

import {
  PatchSessionDto,
  PatchSessionResponse,
  PostSessionResponse,
} from "../interfaces/Sessions";
import { SessionsService } from "../services/SessionsService";

@Route("projects/{projectId}/sessions")
export class SessionsController extends Controller {
  /**
   * セッションを作成する
   * @param projectId 対象のプロジェクトID
   * @param requestBody 対象のストーリーID
   * @returns 作成したセッション
   */
  @Post("")
  public async post(
    @Path() projectId: string,
    @Body() requestBody: { storyId: string }
  ): Promise<PostSessionResponse> {
    try {
      return await new SessionsService().postSession(
        projectId,
        requestBody.storyId,
        transactionRunner
      );
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Post session failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.POST_SESSION_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * セッションを指定したものに更新する
   * @param projectId 対象のプロジェクトID
   * @param sessionId 対処のセッションID
   * @param requestBody セッション
   * @returns 更新後のセッション
   */
  @Patch("{sessionId}")
  public async patch(
    @Path() projectId: string,
    @Path() sessionId: string,
    @Body() requestBody: PatchSessionDto
  ): Promise<PatchSessionResponse> {
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: attachedFileDirectoryService,
    });

    try {
      return await new SessionsService().patchSession(
        projectId,
        sessionId,
        requestBody,
        {
          timestampService: new TimestampServiceImpl(),
          imageFileRepositoryService: imageFileRepositoryService,
        },
        transactionRunner
      );
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Patch session failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.PATCH_SESSION_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * セッションを削除する
   * @param projectId 対象のプロジェクトID
   * @param sessionId 対象のセッションID
   * @returns なし
   */
  @Delete("{sessionId}")
  public async delete(
    @Path() projectId: string,
    @Path() sessionId: string
  ): Promise<void> {
    try {
      await new SessionsService().deleteSession(
        projectId,
        sessionId,
        transactionRunner
      );
      return;
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Delete session failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.DELETE_SESSION_FAILED,
        });
      }
      throw error;
    }
  }
}
