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
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Body, Patch, Route, Path } from "tsoa";
import { attachedFileDirectoryService } from "..";

import { PatchSessionDto, PatchSessionResponse } from "../interfaces/Sessions";
import { SessionsService } from "../services/SessionsService";

@Route("projects/{projectId}/sessions")
export class SessionsController extends Controller {
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
      return await new SessionsService({
        timestampService: new TimestampServiceImpl(),
        imageFileRepositoryService: imageFileRepositoryService,
      }).patchSession(projectId, sessionId, requestBody);
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
}
