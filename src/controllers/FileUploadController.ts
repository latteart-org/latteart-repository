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
import { FileUploadService } from "@/services/FileUploadService";
import multer from "multer";
import express from "express";
import { Controller, Post, Request, Route } from "tsoa";
import { tempDirectoryService } from "..";

@Route("upload")
export class FileUploadController extends Controller {
  @Post()
  public async testResultUpload(
    @Request() request: express.Request
  ): Promise<string[]> {
    await this.handleFile(request);

    try {
      if (!request.files) {
        throw new Error("Files not found.");
      }
      let files: any[];
      if (request.files instanceof Array) {
        files = request.files;
      } else {
        files = [request.files];
      }

      return await new FileUploadService().upload(
        files.map((file) => {
          return {
            filename: file.originalname,
            buffer: file.buffer,
          };
        }) ?? [],
        tempDirectoryService
      );
    } catch (error) {
      if (error instanceof Error) {
        LoggingService.error("File upload failed.", error);
        throw new ServerError(500, {
          code: ServerErrorCode.FILE_UPLOAD_FAILED,
        });
      }
      throw error;
    }
  }

  private handleFile(request: any): Promise<any> {
    const multerSingle = multer().any();
    return new Promise((resolve, reject) => {
      multerSingle(request, "" as any, async (error: any) => {
        if (error) {
          reject(error);
        }
        resolve(1);
      });
    });
  }
}
