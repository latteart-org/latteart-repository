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

import { PatchStoryDto, PatchStoryResponse } from "../interfaces/Stories";
import LoggingService from "@/logger/LoggingService";
import { ServerError, ServerErrorCode } from "@/ServerError";
import { StoriesService } from "@/services/StoriesService";
import { Controller, Body, Patch, Route, Path } from "tsoa";

@Route("stories")
export class StoriesController extends Controller {
  /**
   * ストーリーの一部情報を指定したものに更新する
   * @param storyId 対象のストーリーID
   * @param requestBody ストーリー
   * @returns 更新後のストーリー
   */
  @Patch("{storyId}")
  public async patch(
    @Path() storyId: string,
    @Body() requestBody: PatchStoryDto
  ): Promise<PatchStoryResponse> {
    try {
      return await new StoriesService().patchStory(storyId, requestBody);
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Patch story failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.PATCH_SESSION_FAILED,
        });
      }
      throw error;
    }
  }
}
