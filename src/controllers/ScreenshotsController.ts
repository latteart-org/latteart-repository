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
import { ScreenshotsService } from "@/services/ScreenshotsService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Route, Path, Get } from "tsoa";
import { screenshotDirectoryService, tempDirectoryService } from "..";

@Route("test-results/{testResultId}/screenshots")
export class ScreenshotsController extends Controller {
  @Get()
  public async get(@Path() testResultId: string): Promise<{ url: string }> {
    const timestampService = new TimestampServiceImpl();
    try {
      const url = await new ScreenshotsService().getScreenshots(
        testResultId,
        tempDirectoryService,
        screenshotDirectoryService,
        timestampService
      );
      return { url };
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get screenshots failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.GET_SCREENSHOTS_FAILED,
        });
      }
      throw error;
    }
  }
}
