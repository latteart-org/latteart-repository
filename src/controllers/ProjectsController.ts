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
import { TestProgressServiceImpl } from "@/services/TestProgressService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Get, Post, Route, Path, Query } from "tsoa";
import { transactionRunner } from "..";
import {
  ProjectListResponse,
  GetProjectResponse,
  GetTestProgressResponse,
} from "../interfaces/Projects";
import { ProjectsServiceImpl } from "../services/ProjectsService";

@Route("projects")
export class ProjectsController extends Controller {
  /**
   * プロジェクト一覧を取得する
   * @returns プロジェクト一覧
   */
  @Get()
  public async list(): Promise<ProjectListResponse[]> {
    return new ProjectsServiceImpl(
      {
        timestamp: new TimestampServiceImpl(),
        testProgress: new TestProgressServiceImpl(transactionRunner),
      },
      transactionRunner
    ).getProjectIdentifiers();
  }

  /**
   * プロジェクトを作成する
   * @returns 作成したプロジェクトIDとプロジェクト名
   */
  @Post()
  public async create(): Promise<{ id: string; name: string }> {
    try {
      return await new ProjectsServiceImpl(
        {
          timestamp: new TimestampServiceImpl(),
          testProgress: new TestProgressServiceImpl(transactionRunner),
        },
        transactionRunner
      ).createProject();
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Save project failed.", error);
        throw new ServerError(500, {
          code: ServerErrorCode.SAVE_PROJECT_FAILED,
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * プロジェクト情報を取得する
   * @param projectId 対象のプロジェクトID
   * @returns プロジェクト情報
   */
  @Get("{projectId}")
  public async get(@Path() projectId: string): Promise<GetProjectResponse> {
    try {
      return await new ProjectsServiceImpl(
        {
          timestamp: new TimestampServiceImpl(),
          testProgress: new TestProgressServiceImpl(transactionRunner),
        },
        transactionRunner
      ).getProject(projectId);
    } catch (error: any) {
      if (error instanceof Error) {
        LoggingService.error("Get project failed.", error);

        throw new ServerError(404, {
          code: ServerErrorCode.GET_PROJECT_FAILED,
        });
      } else {
        throw error;
      }
    }
  }

  /**
   * プロジェクト内の指定期間内にあるテスト進捗情報を取得する
   * @param projectId 対象のプロジェクトID
   * @param since 開始日
   * @param until 終了日
   * @returns テスト進捗情報
   */
  @Get("{projectId}/progress")
  public async getTestProgress(
    @Path() projectId: string,
    @Query() since?: number,
    @Query() until?: number
  ): Promise<GetTestProgressResponse[]> {
    try {
      const filter = { since, until };
      return await new TestProgressServiceImpl(
        transactionRunner
      ).collectProjectDailyTestProgresses(projectId, filter);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get test progress failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.GET_TEST_PROGRESS_FAILED,
        });
      } else {
        throw error;
      }
    }
  }
}
