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

import { TestResultEntity } from "@/entities/TestResultEntity";
import {
  CreateTestResultDto,
  ListTestResultResponse,
  CreateTestResultResponse,
  GetTestResultResponse,
  PatchTestResultResponse,
} from "@/interfaces/TestResults";
import { getRepository } from "typeorm";
import { TestStepService } from "./TestStepService";
import { TimestampService } from "./TimestampService";

export interface TestResultService {
  getTestResultIdentifiers(): Promise<ListTestResultResponse[]>;

  getTestResult(id: string): Promise<GetTestResultResponse | undefined>;

  createTestResult(
    body: CreateTestResultDto
  ): Promise<CreateTestResultResponse>;

  patchTestResult(id: string, name: string): Promise<PatchTestResultResponse>;

  collectAllTestStepIds(testResultId: string): Promise<string[]>;

  collectAllTestPurposeIds(testResultId: string): Promise<string[]>;

  collectAllTestStepScreenshots(
    testResultId: string
  ): Promise<{ id: string; fileUrl: string }[]>;
}

export class TestResultServiceImpl implements TestResultService {
  constructor(
    private service: {
      timestamp: TimestampService;
      testStep: TestStepService;
    }
  ) {}

  public async getTestResultIdentifiers(): Promise<ListTestResultResponse[]> {
    const testResultEntities = await getRepository(TestResultEntity).find();

    return testResultEntities.map((testResult) => {
      return {
        id: testResult.id,
        name: testResult.name,
      };
    });
  }

  public async getTestResult(
    id: string
  ): Promise<GetTestResultResponse | undefined> {
    try {
      const testResultEntity = await getRepository(
        TestResultEntity
      ).findOneOrFail(id, {
        relations: [
          "testSteps",
          "testSteps.screenshot",
          "testSteps.notes",
          "testSteps.notes.tags",
          "testSteps.notes.screenshot",
          "testSteps.testPurpose",
        ],
      });
      const { coverageSources } = await getRepository(
        TestResultEntity
      ).findOneOrFail(id, {
        relations: ["coverageSources"],
      });

      const { defaultInputElements } = await getRepository(
        TestResultEntity
      ).findOneOrFail(id, {
        relations: ["defaultInputElements"],
      });

      return await this.convertTestResultEntityToTestResult({
        coverageSources,
        defaultInputElements,
        ...testResultEntity,
      });
    } catch (error) {
      return undefined;
    }
  }

  public async createTestResult(
    body: CreateTestResultDto
  ): Promise<CreateTestResultResponse> {
    const startTimestamp = this.service.timestamp.unix();
    const endTimestamp = -1;

    const { id, name } = await getRepository(TestResultEntity).save({
      name:
        body.name ??
        `session_${this.service.timestamp.format("YYYYMMDD_HHmmss")}`,
      startTimestamp,
      endTimestamp,
      initialUrl: body.initialUrl,
      testSteps: [],
      coverageSources: [],
      defaultInputElements: [],
      testPurposes: [],
      notes: [],
      screenshots: [],
    });

    return {
      id,
      name,
    };
  }

  public async patchTestResult(
    id: string,
    name: string
  ): Promise<PatchTestResultResponse> {
    const testResultEntity = await getRepository(
      TestResultEntity
    ).findOneOrFail(id, {
      relations: [
        "testSteps",
        "testSteps.screenshot",
        "testSteps.notes",
        "testSteps.notes.tags",
        "testSteps.notes.screenshot",
        "testSteps.testPurpose",
      ],
    });

    const { coverageSources } = await getRepository(
      TestResultEntity
    ).findOneOrFail(id, {
      relations: ["coverageSources"],
    });

    const { defaultInputElements } = await getRepository(
      TestResultEntity
    ).findOneOrFail(id, {
      relations: ["defaultInputElements"],
    });

    testResultEntity.name = name;

    const updatedTestResultEntity = await getRepository(TestResultEntity).save(
      testResultEntity
    );

    return this.convertTestResultEntityToTestResult({
      coverageSources,
      defaultInputElements,
      ...updatedTestResultEntity,
    });
  }

  public async collectAllTestStepIds(testResultId: string): Promise<string[]> {
    const testResultEntity = await getRepository(TestResultEntity).findOne(
      testResultId
    );

    return testResultEntity?.testStepIds ?? [];
  }

  public async collectAllTestPurposeIds(
    testResultId: string
  ): Promise<string[]> {
    const testResultEntity = await getRepository(TestResultEntity).findOne(
      testResultId
    );

    return testResultEntity?.testPurposeIds ?? [];
  }

  public async collectAllTestStepScreenshots(
    testResultId: string
  ): Promise<{ id: string; fileUrl: string }[]> {
    const testResultEntity = await getRepository(TestResultEntity).findOne(
      testResultId,
      {
        relations: ["testSteps", "testSteps.screenshot"],
      }
    );

    const screenshots =
      testResultEntity?.testSteps?.flatMap(({ screenshot }) => {
        if (!screenshot) {
          return [];
        }

        return [{ id: screenshot.id, fileUrl: screenshot.fileUrl }];
      }) ?? [];

    return screenshots;
  }

  private async convertTestResultEntityToTestResult(
    testResultEntity: TestResultEntity
  ) {
    const testSteps = await Promise.all(
      testResultEntity.testSteps?.map(async (testStep) => {
        const operation = await this.service.testStep.getTestStepOperation(
          testStep.id
        );
        const notes =
          testStep.notes?.map((note) => {
            return {
              id: note.id,
              type: "notice",
              value: note.value,
              details: note.details,
              tags: note.tags?.map((tag) => tag.name) ?? [],
              imageFileUrl: note.screenshot?.fileUrl ?? "",
              timestamp: note.timestamp,
            };
          }) ?? [];

        const testPurpose = testStep.testPurpose
          ? {
              id: testStep.testPurpose.id,
              type: "intention",
              value: testStep.testPurpose.title,
              details: testStep.testPurpose.details,
              tags: [],
              imageFileUrl: "",
              timestamp: 0,
            }
          : null;

        return {
          id: testStep.id,
          operation,
          intention: testPurpose,
          notices: notes,
          bugs: [],
        };
      }) ?? []
    );

    const coverageSources =
      testResultEntity.coverageSources?.map((coverageSource) => {
        return {
          title: coverageSource.title,
          url: coverageSource.url,
          screenElements: JSON.parse(coverageSource.screenElements),
        };
      }) ?? [];

    const inputElementInfos =
      testResultEntity.defaultInputElements?.map((defaultInputElementInfo) => {
        return {
          title: defaultInputElementInfo.title,
          url: defaultInputElementInfo.url,
          inputElements: JSON.parse(defaultInputElementInfo.inputElements),
        };
      }) ?? [];

    return {
      id: testResultEntity.id,
      name: testResultEntity.name,
      startTimeStamp: testResultEntity.startTimestamp,
      endTimeStamp: testResultEntity.endTimestamp,
      initialUrl: testResultEntity.initialUrl,
      testSteps,
      coverageSources,
      inputElementInfos,
    };
  }
}
