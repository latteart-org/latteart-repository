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
import { ImageFileRepositoryServiceImpl } from "@/services/ImageFileRepositoryService";
import { TestPurposeServiceImpl } from "@/services/TestPurposeService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { Controller, Get, Put, Delete, Body, Post, Route, Path } from "tsoa";
import { screenshotDirectoryService } from "..";
import {
  CreateNoteDto,
  UpdateNoteDto,
  CreateNoteResponse,
  GetNoteResponse,
  UpdateNoteResponse,
} from "../interfaces/Notes";
import { NotesServiceImpl } from "../services/NotesService";

@Route("test-results/{testResultId}/notes")
export class NotesController extends Controller {
  /**
   * Add note (Purpose or Notice) on test results.
   * @param testResultId Target test result id.
   * @param requestBody Purpose or Notices.
   * @returns Registered Purpose or Notices.
   */
  @Post()
  public async addNote(
    @Path() testResultId: string,
    @Body() requestBody: CreateNoteDto
  ): Promise<CreateNoteResponse> {
    console.log("NotesController - addNote");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    if (!["notice", "intention"].includes(requestBody.type)) {
      LoggingService.error(`invalid note type: ${requestBody.type}`);

      throw new ServerError(400, {
        code: ServerErrorCode.ADD_NOTE_FAILED,
      });
    }

    try {
      if (requestBody.type === "notice") {
        return new NotesServiceImpl({
          imageFileRepository: imageFileRepositoryService,
          timestamp: timestampService,
        }).createNote(testResultId, requestBody);
      } else {
        return new TestPurposeServiceImpl().createTestPurpose(
          testResultId,
          requestBody
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Add note failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.ADD_NOTE_FAILED,
        });
      }
      throw error;
    }
  }

  /**
   * Get note (Purpose or Notice).
   * @param testResultId Target test result id.
   * @param noteId Target note id.
   * @returns Purpose or Notice.
   */
  @Get("{noteId}")
  public async getNote(
    @Path() testResultId: string,
    @Path() noteId: string
  ): Promise<GetNoteResponse> {
    console.log("NotesController - getNote");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    try {
      const note = await new NotesServiceImpl({
        imageFileRepository: imageFileRepositoryService,
        timestamp: timestampService,
      }).getNote(noteId);

      if (note) {
        return note;
      }

      const testPurpose = await new TestPurposeServiceImpl().getTestPurpose(
        noteId
      );

      if (testPurpose) {
        return testPurpose;
      }
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Get note failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.GET_NOTE_FAILED,
        });
      }
      throw error;
    }

    LoggingService.error(`Note not found. noteId: ${noteId}`);

    throw new ServerError(404, {
      code: ServerErrorCode.GET_NOTE_FAILED,
    });
  }

  /**
   * Update note (Purpose or Notice) to whatever you specify.
   * @param testResultId Target test result id.
   * @param noteId Target note id.
   * @param requestBody Purpose or Notices
   * @returns Updated Purpose or Notices.
   */
  @Put("{noteId}")
  public async updateNote(
    @Path() testResultId: string,
    @Path() noteId: string,
    @Body() requestBody: UpdateNoteDto
  ): Promise<UpdateNoteResponse> {
    console.log("NotesController - updateNote");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    try {
      const note = await new NotesServiceImpl({
        imageFileRepository: imageFileRepositoryService,
        timestamp: timestampService,
      }).getNote(noteId);

      if (note) {
        return new NotesServiceImpl({
          imageFileRepository: imageFileRepositoryService,
          timestamp: timestampService,
        }).updateNote(noteId, requestBody);
      }

      const testPurpose = await new TestPurposeServiceImpl().getTestPurpose(
        noteId
      );

      if (testPurpose) {
        return new TestPurposeServiceImpl().updateTestPurpose(
          noteId,
          requestBody
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Edit note failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.EDIT_NOTE_FAILED,
        });
      }
      throw error;
    }

    LoggingService.error(`Note not found. noteId: ${noteId}`);

    throw new ServerError(404, {
      code: ServerErrorCode.EDIT_NOTE_FAILED,
    });
  }

  /**
   * Delete note (Purpose or Notice).
   * @param testResultId Target test result id.
   * @param noteId Target note id.
   */
  @Delete("{noteId}")
  public async deleteNote(
    @Path() testResultId: string,
    @Path() noteId: string
  ): Promise<void> {
    console.log("NotesController - deleteNote");

    const timestampService = new TimestampServiceImpl();
    const imageFileRepositoryService = new ImageFileRepositoryServiceImpl({
      staticDirectory: screenshotDirectoryService,
    });

    try {
      const note = await new NotesServiceImpl({
        imageFileRepository: imageFileRepositoryService,
        timestamp: timestampService,
      }).getNote(noteId);

      if (note) {
        return new NotesServiceImpl({
          imageFileRepository: imageFileRepositoryService,
          timestamp: timestampService,
        }).deleteNote(noteId);
      }

      const testPurpose = await new TestPurposeServiceImpl().getTestPurpose(
        noteId
      );

      if (testPurpose) {
        return new TestPurposeServiceImpl().deleteTestPurpose(noteId);
      }
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("Delete note failed.", error);

        throw new ServerError(500, {
          code: ServerErrorCode.DELETE_NOTE_FAILED,
        });
      }
      throw error;
    }

    LoggingService.error(`Note not found. noteId: ${noteId}`);

    throw new ServerError(404, {
      code: ServerErrorCode.DELETE_NOTE_FAILED,
    });
  }
}
