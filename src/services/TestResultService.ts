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

import { CoverageSourceEntity } from "@/entities/CoverageSourceEntity";
import { NoteEntity } from "@/entities/NoteEntity";
import { ScreenshotEntity } from "@/entities/ScreenshotEntity";
import { SessionEntity } from "@/entities/SessionEntity";
import { TestPurposeEntity } from "@/entities/TestPurposeEntity";
import { TestResultEntity } from "@/entities/TestResultEntity";
import { TestStepEntity } from "@/entities/TestStepEntity";
import {
  CreateTestResultDto,
  ListTestResultResponse,
  CreateTestResultResponse,
  GetTestResultResponse,
  PatchTestResultResponse,
  TestResultViewOption,
} from "@/interfaces/TestResults";
import { TransactionRunner } from "@/TransactionRunner";
import { getRepository } from "typeorm";
import { StaticDirectoryServiceImpl } from "./StaticDirectoryService";
import { TestStepService } from "./TestStepService";
import { TimestampService } from "./TimestampService";
import path from "path";
import ScreenDefFactory, {
  ScreenDefinitionConfig,
} from "@/lib/ScreenDefFactory";

/**
 * Sequence view.
 */
export type SequenceView = {
  windows: { id: string; name: string }[];
  screens: { id: string; name: string }[];
  scenarios: {
    testPurpose?: { id: string; value: string; details?: string };
    nodes: SequenceViewNode[];
  }[];
};

/**
 * Sequence view node.
 */
export type SequenceViewNode = {
  windowId: string;
  screenId: string;
  testSteps: {
    id: string;
    type: string;
    input?: string;
    element?: { xpath: string; tagname: string; text: string };
    notes?: { id: string; value: string; details?: string; tags: string[] }[];
  }[];
  disabled: boolean;
};

export interface TestResultService {
  getTestResultIdentifiers(): Promise<ListTestResultResponse[]>;

  getTestResult(id: string): Promise<GetTestResultResponse | undefined>;

  createTestResult(
    body: CreateTestResultDto,
    testResultId: string | null
  ): Promise<CreateTestResultResponse>;

  patchTestResult(params: {
    id: string;
    name?: string;
    startTime?: number;
    initialUrl?: string;
  }): Promise<PatchTestResultResponse>;

  collectAllTestStepIds(testResultId: string): Promise<string[]>;

  collectAllTestPurposeIds(testResultId: string): Promise<string[]>;

  collectAllTestStepScreenshots(
    testResultId: string
  ): Promise<{ id: string; fileUrl: string }[]>;

  generateSequenceView(
    testResultId: string,
    option?: TestResultViewOption
  ): Promise<SequenceView>;
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

      return await this.convertTestResultEntityToTestResult({
        coverageSources,
        ...testResultEntity,
      });
    } catch (error) {
      return undefined;
    }
  }

  public async createTestResult(
    body: CreateTestResultDto,
    testResultId: string | null
  ): Promise<CreateTestResultResponse> {
    const createTimestamp = body.initialUrl
      ? this.service.timestamp.epochMilliseconds()
      : 0;
    const startTimestamp = body.startTimeStamp ?? createTimestamp;

    const lastUpdateTimestamp = -1;

    const testingTime = 0;

    const repository = getRepository(TestResultEntity);

    const newTestResult = await repository.save({
      name:
        body.name ??
        `session_${this.service.timestamp.format("YYYYMMDD_HHmmss")}`,
      startTimestamp,
      lastUpdateTimestamp,
      initialUrl: body.initialUrl ?? "",
      testingTime,
      testSteps: [],
      coverageSources: [],
      testPurposes: [],
      notes: [],
      screenshots: [],
    });

    if (testResultId) {
      const oldTestResult = await repository.findOne(testResultId);
      const sessionRepository = getRepository(SessionEntity);
      sessionRepository.update(
        { testResult: oldTestResult },
        { testResult: newTestResult }
      );
    }

    return {
      id: newTestResult.id,
      name: newTestResult.name,
    };
  }

  public async deleteTestResult(
    testResultId: string,
    transactionRunner: TransactionRunner,
    screenshotDirectoryService: StaticDirectoryServiceImpl
  ): Promise<void> {
    await transactionRunner.waitAndRun(async (transactionalEntityManager) => {
      await transactionalEntityManager.delete(NoteEntity, {
        testResult: { id: testResultId },
      });

      await transactionalEntityManager.delete(TestStepEntity, {
        testResult: { id: testResultId },
      });
      await transactionalEntityManager.delete(CoverageSourceEntity, {
        testResult: { id: testResultId },
      });
      await transactionalEntityManager.delete(TestPurposeEntity, {
        testResult: { id: testResultId },
      });

      const fileUrls = (
        await transactionalEntityManager.find(ScreenshotEntity, {
          testResult: { id: testResultId },
        })
      ).map((screenshot) => screenshot.fileUrl);

      await transactionalEntityManager.delete(ScreenshotEntity, {
        testResult: { id: testResultId },
      });
      await transactionalEntityManager.delete(TestResultEntity, testResultId);

      fileUrls.forEach((fileUrl) => {
        screenshotDirectoryService.removeFile(path.basename(fileUrl));
      });
    });
    return;
  }

  public async patchTestResult(params: {
    id: string;
    name?: string;
    startTime?: number;
    initialUrl?: string;
  }): Promise<PatchTestResultResponse> {
    const id = params.id;
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

    if (params.initialUrl) {
      testResultEntity.initialUrl = params.initialUrl;
    }

    if (params.name) {
      testResultEntity.name = params.name;
    }

    if (params.startTime) {
      testResultEntity.startTimestamp = params.startTime;
    }

    const updatedTestResultEntity = await getRepository(TestResultEntity).save(
      testResultEntity
    );

    return this.convertTestResultEntityToTestResult({
      coverageSources,
      ...updatedTestResultEntity,
    });
  }

  public async collectAllTestStepIds(testResultId: string): Promise<string[]> {
    const testResultEntity = await getRepository(TestResultEntity).findOne(
      testResultId,
      {
        relations: ["testSteps"],
      }
    );

    return (
      testResultEntity?.testSteps
        ?.slice()
        .sort(
          (testStepA, testStepB) => testStepA.timestamp - testStepB.timestamp
        )
        .map((testStep) => testStep.id) ?? []
    );
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

  public async generateSequenceView(
    testResultId: string,
    option: TestResultViewOption = { node: { unit: "title", definitions: [] } }
  ): Promise<SequenceView> {
    const screenDefinitionConfig: ScreenDefinitionConfig = {
      screenDefType: option.node.unit,
      conditionGroups: option.node.definitions.map((definition) => {
        return {
          isEnabled: true,
          screenName: definition.name,
          conditions: definition.conditions.map((condition) => {
            return {
              isEnabled: true,
              definitionType: condition.target,
              matchType: condition.method,
              word: condition.value,
            };
          }),
        };
      }),
    };

    const testResult = await this.getTestResult(testResultId);

    if (!testResult) {
      return { windows: [], screens: [], scenarios: [] };
    }

    const screenDefFactory = new ScreenDefFactory(screenDefinitionConfig);
    const screenDefToScreenId = new Map(
      testResult.testSteps
        .map(({ operation }) =>
          screenDefFactory.create({
            url: operation.url,
            title: operation.title,
            keywordSet: new Set(operation.keywordTexts),
          })
        )
        .filter((screenDef, index, screenDefs) => {
          return screenDefs.indexOf(screenDef) === index;
        })
        .map((screenDef, index) => {
          return [screenDef, { id: `s${index}`, name: screenDef }];
        })
    );

    return {
      windows: testResult.testSteps
        .map(({ operation }) => operation.windowHandle)
        .filter((windowHandle, index, array) => {
          return array.indexOf(windowHandle) === index;
        })
        .map((windowHandle, index) => {
          return { id: windowHandle, name: `window${index + 1}` };
        }),
      screens: [...screenDefToScreenId.values()],
      scenarios: testResult.testSteps.reduce(
        (acc: SequenceView["scenarios"], testStep) => {
          const lastScenario = acc.at(-1);
          const isNewTestPurpose =
            !lastScenario ||
            (testStep.intention !== null &&
              lastScenario.testPurpose?.id !== testStep.intention.id);
          if (isNewTestPurpose) {
            acc.push({
              testPurpose: testStep.intention
                ? { ...testStep.intention, id: testStep.intention.id ?? "" }
                : undefined,
              nodes: [],
            });
          }
          const lastNode = acc.at(-1)?.nodes.at(-1);
          const screenId = screenDefToScreenId.get(
            screenDefFactory.create({
              url: testStep.operation.url,
              title: testStep.operation.title,
              keywordSet: new Set(testStep.operation.keywordTexts),
            })
          )?.id;
          if (screenId) {
            if (testStep.operation.type === "resume_capturing") {
              acc.at(-1)?.nodes.push({
                windowId: testStep.operation.windowHandle,
                screenId,
                testSteps: [],
                disabled: false,
              });
            } else if (
              (lastNode?.testSteps.at(-1)?.type === "pause_capturing" ||
                lastNode?.disabled) &&
              (lastNode === undefined ||
                lastNode.windowId !== testStep.operation.windowHandle ||
                testStep.operation.type === "screen_transition")
            ) {
              acc.at(-1)?.nodes.push({
                windowId: testStep.operation.windowHandle,
                screenId,
                testSteps: [],
                disabled: true,
              });
            } else if (
              lastNode === undefined ||
              lastNode.windowId !== testStep.operation.windowHandle ||
              testStep.operation.type === "screen_transition"
            ) {
              acc.at(-1)?.nodes.push({
                windowId: testStep.operation.windowHandle,
                screenId,
                testSteps: [],
                disabled: false,
              });
            }
          }
          acc
            .at(-1)
            ?.nodes.at(-1)
            ?.testSteps.push({
              id: testStep.id,
              type: testStep.operation.type,
              input: testStep.operation.input,
              element: testStep.operation.elementInfo
                ? {
                    xpath: testStep.operation.elementInfo.xpath,
                    tagname: testStep.operation.elementInfo.tagname,
                    text: (({ elementInfo }) => {
                      if (!elementInfo) {
                        return "";
                      }
                      if (elementInfo.text) {
                        return elementInfo.text;
                      }
                      return `${elementInfo.attributes.value ?? ""}`;
                    })(testStep.operation),
                  }
                : undefined,
              notes: [
                ...(testStep.bugs ?? []),
                ...(testStep.notices ?? []),
              ].map((note) => {
                return { ...note, id: note.id ?? "" };
              }),
            });
          return acc;
        },
        []
      ),
    };
  }

  private async convertTestResultEntityToTestResult(
    testResultEntity: TestResultEntity
  ) {
    const testSteps = await Promise.all(
      testResultEntity.testSteps
        ?.sort(function (first, second) {
          return first.timestamp - second.timestamp;
        })
        .map(async (testStep) => {
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

    return {
      id: testResultEntity.id,
      name: testResultEntity.name,
      startTimeStamp: testResultEntity.startTimestamp,
      lastUpdateTimeStamp: testResultEntity.lastUpdateTimestamp,
      initialUrl: testResultEntity.initialUrl,
      testingTime: testResultEntity.testingTime,
      testSteps,
      coverageSources,
    };
  }
}
