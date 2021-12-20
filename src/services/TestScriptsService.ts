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

import { ProjectEntity } from "@/entities/ProjectEntity";
import { CreateTestScriptDto } from "@/interfaces/TestScripts";
import { getRepository } from "typeorm";
import { TestResultService } from "./TestResultService";
import { TestScriptFileRepositoryService } from "./TestScriptFileRepositoryService";

export class TestScriptsService {
  constructor(
    private service: {
      testResult: TestResultService;
      testScriptFileRepository: TestScriptFileRepositoryService;
    }
  ) {}

  public async createTestScriptByProject(
    projectId: string,
    requestBody: CreateTestScriptDto
  ): Promise<{ url: string }> {
    console.log(projectId, requestBody);

    const testResultIds = (
      await getRepository(ProjectEntity).findOneOrFail({
        relations: [
          "testMatrices",
          "testMatrices.stories",
          "testMatrices.stories.sessions",
          "testMatrices.stories.sessions.testResult",
        ],
      })
    ).testMatrices.flatMap((testMatrix) => {
      return testMatrix.stories.flatMap((story) => {
        return story.sessions.flatMap((session) => {
          return session.testResult ? [session.testResult.id] : [];
        });
      });
    });

    const screenshots: { id: string; fileUrl: string }[] = (
      await Promise.all(
        testResultIds.map((testResultId) => {
          return this.service.testResult.collectAllTestStepScreenshots(
            testResultId
          );
        })
      )
    ).flat();

    const url = await this.service.testScriptFileRepository.write(
      requestBody,
      screenshots
    );

    return { url };
  }

  public async createTestScriptByTestResult(
    testResultId: string,
    requestBody: CreateTestScriptDto
  ): Promise<{ url: string }> {
    console.log(testResultId, requestBody);

    const screenshots = await this.service.testResult.collectAllTestStepScreenshots(
      testResultId
    );

    const url = await this.service.testScriptFileRepository.write(
      requestBody,
      screenshots
    );

    return { url };
  }
}
