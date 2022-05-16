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

import { SettingsUtility } from "@/lib/settings/SettingsUtility";
import LoggingService from "@/logger/LoggingService";
import { ServerErrorCode, ServerError } from "@/ServerError";
import { CommandExecutionServiceImpl } from "@/services/CommandExecutionService";
import { ConfigsService } from "@/services/ConfigsService";
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { NotesServiceImpl } from "@/services/NotesService";
import { TestStepServiceImpl } from "@/services/TestStepService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Post, Route, Path } from "tsoa";
import { screenshotDirectoryService } from "..";
import { CreateResponseDto } from "../interfaces/NoteCompressedImage";
import { CompressedImageService } from "../services/CompressedImageService";

@Route("test-results/{testResultId}/notes/{noteId}/compressed-image")
export class NoteCompressedImageController extends Controller {
  @Post()
  public async create(
    @Path() testResultId: string,
    @Path() noteId: string
  ): Promise<CreateResponseDto> {
    console.log("NoteCompressedImageController - compressImage");

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
      }).compressImageForNote(noteId, {
        shouldDeleteOriginalFile: SettingsUtility.getSetting(
          "config.imageCompression.isDeleteSrcImage"
        ),
      });
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Compress note image failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.COMPRESS_NOTE_IMAGE_FAILED,
        });
      }
      throw error;
    }
  }
}
