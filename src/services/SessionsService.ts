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

import { AttachedFileEntity } from "@/entities/AttachedFilesEntity";
import { SessionEntity } from "@/entities/SessionEntity";
import { TestResultEntity } from "@/entities/TestResultEntity";
import { PatchSessionDto, PatchSessionResponse } from "@/interfaces/Sessions";
import { getRepository } from "typeorm";
import { ImageFileRepositoryService } from "./ImageFileRepositoryService";
import { TimestampService } from "./TimestampService";

export class SessionsService {
  constructor(
    private service: {
      timestampService: TimestampService;
      imageFileRepositoryService: ImageFileRepositoryService;
    }
  ) {}

  public async patchSession(
    projectId: string,
    sessionId: string,
    requestBody: PatchSessionDto
  ): Promise<PatchSessionResponse> {
    const sessionRepository = getRepository(SessionEntity);
    const updateTargetSession = await sessionRepository.findOne(sessionId, {
      relations: ["testResult", "story", "attachedFiles"],
    });
    if (!updateTargetSession) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (requestBody.attachedFiles !== undefined) {
      updateTargetSession.attachedFiles = await this.updateAttachedFiles(
        updateTargetSession,
        requestBody.attachedFiles
      );
    }

    if (requestBody.isDone !== undefined) {
      updateTargetSession.doneDate = "";
    }

    if (requestBody.doneDate !== undefined) {
      updateTargetSession.doneDate = requestBody.doneDate;
    }

    if (requestBody.issues) {
      //
    }
    if (requestBody.memo !== undefined) {
      updateTargetSession.memo = requestBody.memo;
    }
    if (requestBody.name !== undefined) {
      updateTargetSession.name = requestBody.name;
    }
    if (requestBody.testItem !== undefined) {
      updateTargetSession.testItem = requestBody.testItem;
    }
    if (requestBody.testerName !== undefined) {
      updateTargetSession.testUser = requestBody.testerName;
    }
    if (requestBody.testingTime !== undefined) {
      updateTargetSession.testingTime = requestBody.testingTime;
    }

    if (requestBody.testResultFiles) {
      if (requestBody.testResultFiles.length > 0) {
        const testResult = await getRepository(TestResultEntity).findOne(
          requestBody.testResultFiles[0].id
        );
        if (!testResult) {
          throw new Error("test result not found.");
        }
        updateTargetSession.testResult = testResult;
      } else {
        updateTargetSession.testResult = null;
      }
    }

    await sessionRepository.save(updateTargetSession);
    const savedSession = await sessionRepository.findOne(sessionId, {
      relations: ["testResult", "story", "attachedFiles"],
    });
    if (!savedSession) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      attachedFiles:
        savedSession.attachedFiles
          ?.sort((a, b) => {
            return (a.createdDate as Date).toLocaleString() >
              (b.createdDate as Date).toLocaleString()
              ? 1
              : -1;
          })
          .map((attachedFile) => {
            return { name: attachedFile.name, fileUrl: attachedFile.name };
          }) ?? [],
      doneDate: savedSession.doneDate,
      isDone: !!savedSession.doneDate,
      issues: [],
      memo: savedSession.memo,
      name: savedSession.name,
      testItem: savedSession.testItem,
      testResultFiles: savedSession.testResult
        ? [
            {
              id: savedSession.testResult.id,
              name: savedSession.testResult.name,
            },
          ]
        : [],
      testerName: savedSession.testUser,
      testingTime: savedSession.testingTime,
    };
  }

  private async updateAttachedFiles(
    existsSession: SessionEntity,
    requestAttachedFiles: PatchSessionDto["attachedFiles"]
  ): Promise<AttachedFileEntity[]> {
    if (!requestAttachedFiles) {
      return [];
    }

    const existsAttachedFiles = existsSession.attachedFiles ?? [];
    const result = [];

    for (const attachedFile of requestAttachedFiles) {
      if (attachedFile.fileUrl) {
        const existsAttachedFile = existsAttachedFiles.find(
          (existsAttachedFile) =>
            existsAttachedFile.fileUrl === attachedFile.fileUrl
        );
        if (!existsAttachedFile) {
          throw new Error(`AttachedFile not found: ${attachedFile.fileUrl}`);
        }
        result.push(existsAttachedFile);
      } else if (attachedFile.fileData) {
        const attachedFileImageUrl = await this.service.imageFileRepositoryService.writeBase64ToFile(
          `${this.service.timestampService.unix().toString()}_${
            attachedFile.name
          }`,
          attachedFile?.fileData as string
        );

        result.push(
          new AttachedFileEntity({
            session: existsSession,
            name: attachedFile.name,
            fileUrl: attachedFileImageUrl,
          })
        );
      }
    }
    return result;
  }
}
