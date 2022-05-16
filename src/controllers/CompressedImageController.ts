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

import { CreateCompressedImageResponse } from "../interfaces/CompressedImage";
import { Controller, Post, Route, Path } from "tsoa";
import { CompressedImageService } from "../services/CompressedImageService";
import { CommandExecutionServiceImpl } from "@/services/CommandExecutionService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { NotesServiceImpl } from "@/services/NotesService";
import { ConfigsService } from "@/services/ConfigsService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { screenshotDirectoryService } from "..";
import LoggingService from "@/logger/LoggingService";
import { ServerErrorCode, ServerError } from "@/ServerError";

@Route("test-results/{testResultId}/test-steps/{testStepId}/compressed-image")
export class CompressedImageController extends Controller {
  @Post()
  public async create(
    @Path() testResultId: string,
    @Path() testStepId: string
  ): Promise<CreateCompressedImageResponse> {
    console.log("CompressedImageController - compressImage");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    const testStepService = new TestStepServiceImpl({
      imageFileRepository: imageFileRepositoryService,
      timestamp: timestampService,
      config: new ConfigsService(),
    });
    const noteService = new NotesServiceImpl({
      imageFileRepository: imageFileRepositoryService,
      timestamp: timestampService,
    });

    try {
      return new CompressedImageService({
        imageFileRepository: imageFileRepositoryService,
        testStep: testStepService,
        note: noteService,
        commandExecution: new CommandExecutionServiceImpl(),
      }).compressImage(testStepId, {
        shouldDeleteOriginalFile: (await new ConfigsService().getConfig(""))
          .config.imageCompression.isDeleteSrcImage,
      });
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Compress test step image failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.COMPRESS_TEST_STEP_IMAGE_FAILED,
        });
      }
      throw error;
    }
  }
}
