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

import { TestProgressEntity } from "@/entities/TestProgressEntity";
import {
  Between,
  getRepository,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
} from "typeorm";
import { StoryEntity } from "@/entities/StoryEntity";
import {
  dateToFormattedString,
  unixtimeToFormattedString,
} from "@/lib/timeUtil";
import { TestTargetEntity } from "@/entities/TestTargetEntity";
import { ProjectsServiceImpl } from "./ProjectsService";
import { TimestampServiceImpl } from "./TimestampService";
import { transactionRunner } from "..";

export type DailyTestProgress = {
  date: string;
  storyProgresses: {
    storyId: string;
    testMatrixId: string;
    testTargetGroupId: string;
    testTargetId: string;
    viewPointId: string;
    plannedSessionNumber: number;
    completedSessionNumber: number;
    incompletedSessionNumber: number;
  }[];
};

export interface TestProgressService {
  registerStoryTestProgresses(...storyIds: string[]): Promise<void>;

  registerProjectTestProgresses(projectId: string): Promise<void>;

  updateTestProgress(
    progress: TestProgressEntity,
    newTestProgress: Partial<{
      plannedSessionNumber: number;
      completedSessionNumber: number;
      incompletedSessionNumber: number;
    }>
  ): Promise<void>;

  collectStoryDailyTestProgresses(
    storyIds: string[],
    filter?: { since?: number; until?: number }
  ): Promise<DailyTestProgress[]>;

  collectProjectDailyTestProgresses(
    projectId: string,
    filter?: { since?: number; until?: number }
  ): Promise<DailyTestProgress[]>;

  getNewTestProgress(storyId: string): Promise<{
    plannedSessionNumber: number;
    completedSessionNumber: number;
    incompletedSessionNumber: number;
  }>;

  getTodayTestProgress(
    storyId: string
  ): Promise<TestProgressEntity | undefined>;
}

export class TestProgressServiceImpl implements TestProgressService {
  public async registerStoryTestProgresses(
    ...storyIds: string[]
  ): Promise<void> {
    const storyProgresses = await Promise.all(
      storyIds.map(async (storyId) => {
        const storyRepository = getRepository(StoryEntity);
        const story = await storyRepository.findOneOrFail(storyId, {
          relations: ["sessions"],
        });

        const testTargetRepository = getRepository(TestTargetEntity);
        const testTarget = await testTargetRepository.findOneOrFail(
          story.testTargetId
        );
        const plans: { viewPointId: string; value: number }[] = JSON.parse(
          testTarget.text
        );

        return {
          plannedSessionNumber:
            plans.find((plan) => plan.viewPointId === story.viewPointId)
              ?.value ?? 0,
          completedSessionNumber: story.sessions.filter(
            (session) => session.doneDate
          ).length,
          incompletedSessionNumber: story.sessions.filter(
            (session) => !session.doneDate
          ).length,
          story,
          date: new Date(),
        };
      })
    );

    const testProgressRepository = getRepository(TestProgressEntity);

    await testProgressRepository.save(storyProgresses);
  }

  public async registerProjectTestProgresses(projectId: string): Promise<void> {
    const project = await new ProjectsServiceImpl(
      {
        timestamp: new TimestampServiceImpl(),
        testProgress: new TestProgressServiceImpl(),
      },
      transactionRunner
    ).getProject(projectId);

    const storyIds = project.stories.map((story) => story.id);

    return await this.registerStoryTestProgresses(...storyIds);
  }

  public async updateTestProgress(
    progress: TestProgressEntity,
    newTestProgress: Partial<{
      plannedSessionNumber: number;
      completedSessionNumber: number;
      incompletedSessionNumber: number;
    }>
  ): Promise<void> {
    const testProgressEntity = getRepository(TestProgressEntity);

    if (newTestProgress.plannedSessionNumber) {
      progress.plannedSessionNumber = newTestProgress.plannedSessionNumber;
    }

    if (newTestProgress.completedSessionNumber) {
      progress.completedSessionNumber = newTestProgress.completedSessionNumber;
    }

    if (newTestProgress.incompletedSessionNumber) {
      progress.incompletedSessionNumber =
        newTestProgress.incompletedSessionNumber;
    }

    await testProgressEntity.save(progress);
  }

  public async collectStoryDailyTestProgresses(
    storyIds: string[],
    filter: { since?: number; until?: number } = {}
  ): Promise<DailyTestProgress[]> {
    const testProgressRepository = getRepository(TestProgressEntity);

    const since =
      filter.since !== undefined
        ? unixtimeToFormattedString(filter.since, "YYYY-MM-DD HH:mm:ss")
        : undefined;
    const until =
      filter.until !== undefined
        ? unixtimeToFormattedString(filter.until, "YYYY-MM-DD HH:mm:ss")
        : undefined;

    const periodCondition =
      since && until
        ? { date: Between(since, until) }
        : since
        ? { date: MoreThanOrEqual(since) }
        : until
        ? { date: LessThanOrEqual(until) }
        : {};

    const entities = await testProgressRepository.find({
      where: {
        story: In(storyIds),
        ...periodCondition,
      },
      order: { date: "ASC" },
      relations: [
        "story",
        "story.testTarget",
        "story.testTarget.testTargetGroup",
      ],
    });

    return Array.from(
      entities.reduce((acc, entity) => {
        const date = dateToFormattedString(entity.date, "YYYY-MM-DD");

        if (!acc.has(date)) {
          acc.set(date, new Map());
        }

        acc.get(date)?.set(entity.story.id, entity);

        return acc;
      }, new Map<string, Map<string, TestProgressEntity>>())
    ).map(([date, storyIdToEntity]) => {
      return {
        date,
        storyProgresses: Array.from(storyIdToEntity.values()).map((entity) => {
          return {
            storyId: entity.story.id,
            testMatrixId: entity.story.testMatrixId,
            testTargetGroupId: entity.story.testTarget.testTargetGroup.id,
            testTargetId: entity.story.testTargetId,
            viewPointId: entity.story.viewPointId,
            plannedSessionNumber: entity.plannedSessionNumber,
            completedSessionNumber: entity.completedSessionNumber,
            incompletedSessionNumber: entity.incompletedSessionNumber,
          };
        }),
      };
    });
  }

  public async collectProjectDailyTestProgresses(
    projectId: string,
    filter: { since?: number; until?: number } = {}
  ): Promise<DailyTestProgress[]> {
    const project = await new ProjectsServiceImpl(
      {
        timestamp: new TimestampServiceImpl(),
        testProgress: new TestProgressServiceImpl(),
      },
      transactionRunner
    ).getProject(projectId);

    const storyIds = project.stories.map((story) => story.id);

    return await this.collectStoryDailyTestProgresses(storyIds, filter);
  }

  public async getNewTestProgress(storyId: string): Promise<{
    plannedSessionNumber: number;
    completedSessionNumber: number;
    incompletedSessionNumber: number;
  }> {
    const story = await getRepository(StoryEntity).findOneOrFail(storyId, {
      relations: ["sessions"],
    });

    const testTarget = await getRepository(TestTargetEntity).findOneOrFail(
      story.testTargetId
    );
    const plans: { viewPointId: string; value: number }[] = JSON.parse(
      testTarget.text
    );

    return {
      plannedSessionNumber:
        plans.find((plan) => plan.viewPointId === story.viewPointId)?.value ??
        0,
      completedSessionNumber: story.sessions.filter(
        (session) => session.doneDate
      ).length,
      incompletedSessionNumber: story.sessions.filter(
        (session) => !session.doneDate
      ).length,
    };
  }

  public async getTodayTestProgress(
    storyId: string
  ): Promise<TestProgressEntity | undefined> {
    const _d = new Date();
    const d = new Date(_d.getFullYear(), _d.getMonth(), _d.getDate(), 0, 0, 0);
    const today = dateToFormattedString(d, "YYYY-MM-DD HH:mm");

    return await getRepository(TestProgressEntity).findOne({
      where: { story: storyId, createdAt: MoreThanOrEqual(today) },
      order: { createdAt: "DESC" },
    });
  }
}
