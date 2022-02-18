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

import { CreateFileUploadRequestDto } from "../interfaces/FileUploadRequest";
import LoggingService from "@/logger/LoggingService";
import { ServerError, ServerErrorCode } from "@/ServerError";
import { FileUploadRequestService } from "@/services/FileUploadRequestService";
import { Controller, Post, Route, Body } from "tsoa";

@Route("upload-request/test-result")
export class FileUploadRequestController extends Controller {
  @Post()
  public async upload(
    @Body() requestBody: CreateFileUploadRequestDto
  ): Promise<{ id: string }> {
    try {
      const service = new FileUploadRequestService();
      const { data } = await service.upload(requestBody);

      const result = await service.importRequest(
        data[0],
        requestBody.url,
        requestBody.id
      );
      return { id: result.data.testResultId };
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("File upload request failed.", error);
        throw new ServerError(500, {
          code: ServerErrorCode.FILE_UPLOAD_REQUEST_FAILED,
        });
      }
      throw error;
    }
  }
}
