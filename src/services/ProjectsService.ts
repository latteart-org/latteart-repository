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

import {
  ProjectListResponse,
  GetProjectResponse,
  UpdateProjectResponse,
  UpdateProjectDto,
  Project,
} from "../interfaces/Projects";
import { ProjectEntity } from "../entities/ProjectEntity";
import { EntityManager, getManager } from "typeorm";
import { ViewPointPresetEntity } from "../entities/ViewPointPresetEntity";
import { getRepository } from "typeorm";
import { TestMatrixEntity } from "../entities/TestMatrixEntity";
import { TestTargetGroupEntity } from "../entities/TestTargetGroupEntity";
import { TestTargetEntity } from "../entities/TestTargetEntity";
import { ViewPointEntity } from "../entities/ViewPointEntity";
import { StoryEntity } from "@/entities/StoryEntity";
import { SessionEntity } from "@/entities/SessionEntity";
import { TestResultEntity } from "@/entities/TestResultEntity";
import LoggingService from "@/logger/LoggingService";
import { TimestampService } from "./TimestampService";
import { TransactionRunner } from "@/TransactionRunner";
import { TestProgressService } from "./TestProgressService";

export interface ProjectsService {
  getProjectIdentifiers(): Promise<ProjectListResponse[]>;
  createProject(): Promise<{ id: string; name: string }>;
  getProject(projectId: string): Promise<GetProjectResponse>;
  updateProject(
    projectId: string,
    requestBody: UpdateProjectDto
  ): Promise<UpdateProjectResponse>;
}

export class ProjectsServiceImpl implements ProjectsService {
  private static DATETIME_LOG_FORMAT = "YYYY-MM-DD HH:mm:ss:SS";

  constructor(
    private service: {
      timestamp: TimestampService;
      testProgress: TestProgressService;
    },
    private transactionRunner: TransactionRunner
  ) {}

  public async getProjectIdentifiers(): Promise<ProjectListResponse[]> {
    const projectRepository = getRepository(ProjectEntity);
    const projects = await projectRepository.find();
    console.log(projects);
    return projects
      .map((project) => {
        return {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt?.toString() ?? "",
        };
      })
      .sort((a, b) => {
        return a.createdAt > b.createdAt ? 1 : -1;
      });
  }

  public async createProject(): Promise<{ id: string; name: string }> {
    let savedProject: ProjectEntity | null = null;
    await getManager().transaction(async (transactionEntityManager) => {
      savedProject = await transactionEntityManager.save(
        new ProjectEntity("1")
      );

      await transactionEntityManager.save(
        new ViewPointPresetEntity({ project: savedProject, name: "" })
      );
    });
    if (!savedProject) {
      throw new Error("Project save failed.");
    }
    return {
      id: (savedProject as ProjectEntity).id,
      name: (savedProject as ProjectEntity).name,
    };
  }

  public async getProject(projectId: string): Promise<GetProjectResponse> {
    const project = await this.getReturnProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return this.projectEntityToResponse(project);
  }

  public async updateProject(
    projectId: string,
    requestBody: UpdateProjectDto
  ): Promise<UpdateProjectResponse> {
    const projectRepository = getRepository(ProjectEntity);

    const existsProject = await projectRepository.findOne(projectId, {
      relations: ["testMatrices"],
    });
    if (!existsProject) {
      throw new Error(`Project not found: ${projectId}`);
    }
    LoggingService.debug(
      `START ALL SELECT1 - ${this.service.timestamp.format(
        ProjectsServiceImpl.DATETIME_LOG_FORMAT
      )}`
    );

    const testMatrixRepository = getRepository(TestMatrixEntity);
    const testTargetGroupRepository = getRepository(TestTargetGroupEntity);
    const testMatrices = await Promise.all(
      existsProject.testMatrices.map(async (testMatrix) => {
        const testMatrixWithStory = await testMatrixRepository.findOne(
          testMatrix.id,
          { relations: ["stories", "stories.sessions"] }
        );
        if (!testMatrixWithStory) {
          throw new Error(`TestMatrix not found: ${testMatrix.id}`);
        }
        testMatrixWithStory.testTargetGroups =
          await testTargetGroupRepository.find({
            where: { testMatrix: testMatrix.id },
            relations: ["testTargets"],
          });
        testMatrixWithStory.viewPoints = (
          await testMatrixRepository.findOne(testMatrix.id, {
            relations: ["viewPoints"],
          })
        )?.viewPoints as ViewPointEntity[];
        return testMatrixWithStory;
      })
    );
    existsProject.testMatrices = testMatrices;

    LoggingService.debug(
      `END ALL SELECT1 - ${this.service.timestamp.format(
        ProjectsServiceImpl.DATETIME_LOG_FORMAT
      )}`
    );
    let unupdatedTestMatrices = existsProject.testMatrices;
    let unupdatedTestTargetGroups = unupdatedTestMatrices
      .map((testMatrix) => testMatrix.testTargetGroups)
      .flat();
    let unupdatedTestTargets = unupdatedTestTargetGroups
      .map((group) => group.testTargets)
      .flat();
    let unupdatedViewPoints = unupdatedTestMatrices
      .map((tm) => tm.viewPoints)
      .flat();
    let unupdatedStories = unupdatedTestMatrices
      .map((testMatrix) => testMatrix.stories)
      .flat();
    let unupdatedSessions = unupdatedStories
      .map((story) => story.sessions)
      .flat();

    LoggingService.debug(
      `START UPDATE - ${this.service.timestamp.format(
        ProjectsServiceImpl.DATETIME_LOG_FORMAT
      )}`
    );

    // new items for binding to progress datas.
    let newTestMatrixEntity: TestMatrixEntity | undefined;
    let newTestTargetGroupEntity: TestTargetGroupEntity | undefined;
    let newTestTargetEntity: TestTargetEntity | undefined;

    await this.transactionRunner.waitAndRun(
      async (transactionalEntityManager) => {
        for (const [index, testMatrix] of requestBody.testMatrices.entries()) {
          const savedTestMatrixWithUnupdatedList = await this.updateTestMatrix(
            transactionalEntityManager,
            testMatrix.id,
            testMatrix.name,
            index,
            existsProject,
            unupdatedTestMatrices
          );
          const testMatrixEntity =
            savedTestMatrixWithUnupdatedList.testMatrixEntity;
          unupdatedTestMatrices =
            savedTestMatrixWithUnupdatedList.unupdatedList;

          if (!testMatrix.id) {
            newTestMatrixEntity = testMatrixEntity;
          }

          for (const [index, testTargetGroup] of testMatrix.groups.entries()) {
            const savedTestTargetGroupWithUnupdatedList =
              await this.updateTestTargetGroup(
                transactionalEntityManager,
                testTargetGroup.id,
                testTargetGroup.name,
                index,
                testMatrixEntity,
                unupdatedTestTargetGroups
              );
            const testTargetGroupEntity =
              savedTestTargetGroupWithUnupdatedList.testTargetGroupEntity;
            unupdatedTestTargetGroups =
              savedTestTargetGroupWithUnupdatedList.unupdatedList;

            if (!testTargetGroup.id) {
              newTestTargetGroupEntity = testTargetGroupEntity;
            }

            for (const [
              index,
              testTarget,
            ] of testTargetGroup.testTargets.entries()) {
              const savedTestTargetWithUnupdatedList =
                await this.updateTestTarget(
                  transactionalEntityManager,
                  testTarget.id,
                  testTarget.name,
                  index,
                  JSON.stringify(testTarget.plans),
                  testTargetGroupEntity,
                  unupdatedTestTargets
                );
              unupdatedTestTargets =
                savedTestTargetWithUnupdatedList.unupdatedList;

              if (!testTarget.id) {
                newTestTargetEntity =
                  savedTestTargetWithUnupdatedList.testTargetEntity;

                await this.createStoriesFromTestTarget(
                  transactionalEntityManager,
                  testMatrixEntity.id,
                  savedTestTargetWithUnupdatedList.testTargetEntity
                );
              }
            }
          }
          for (const viewPoint of testMatrix.viewPoints ?? []) {
            const savedViewPointWithUnupdatedList = await this.updateViewPoint(
              transactionalEntityManager,
              viewPoint.id,
              viewPoint.name,
              viewPoint.description,
              viewPoint.index,
              testMatrixEntity,
              unupdatedViewPoints
            );
            unupdatedViewPoints = savedViewPointWithUnupdatedList.unupdatedList;
            if (testMatrix.id && !viewPoint.id) {
              const testMatrixEntity = existsProject.testMatrices.find(
                (m) => m.id === testMatrix.id
              );
              if (!testMatrixEntity) {
                throw new Error(
                  `TestMatrix not found: textMatrixId:${testMatrix.id}, viewPointId: ${viewPoint.id}`
                );
              }
              await this.createStoriesFromViewPoint(
                transactionalEntityManager,
                savedViewPointWithUnupdatedList.viewPointEntry,
                testMatrixEntity
              );
            }
          }
        }

        for (const [index, story] of requestBody.stories.entries()) {
          let existsStory = null;
          for (const t of existsProject.testMatrices) {
            for (const s of t.stories) {
              if (s.id === story.id) {
                existsStory = s;
                break;
              }
            }
            if (existsStory) {
              break;
            }
          }
          if (!existsStory) {
            continue;
          }
          const savedStoryWithUnupdatedList = await this.updateStory(
            transactionalEntityManager,
            story.id,
            index,
            story.status,
            existsStory,
            unupdatedStories
          );
          const savedStory = savedStoryWithUnupdatedList.storyEntity;
          unupdatedStories = savedStoryWithUnupdatedList.unupdatedList;

          for (const [index, session] of story.sessions.entries()) {
            const sessionEntityWithUnupdateList = await this.updateSession(
              transactionalEntityManager,
              session.id,
              session.name,
              index,
              session.testerName,
              session.memo,
              session.testItem,
              session.testingTime,
              session.doneDate,
              savedStory,
              session.testResultFiles ?? [],
              unupdatedSessions
            );
            unupdatedSessions = sessionEntityWithUnupdateList.unupdatedList;
          }

          const plannedSessionNumber =
            requestBody.testMatrices
              .find((testMatrix) => testMatrix.id === story.testMatrixId)
              ?.groups.find((group) =>
                group.testTargets.some(
                  (testTarget) => testTarget.id === story.testTargetId
                )
              )
              ?.testTargets.find(
                (testTarget) => testTarget.id === story.testTargetId
              )
              ?.plans.find((plan) => plan.viewPointId === story.viewPointId)
              ?.value ?? 0;

          await this.service.testProgress.registerTestProgress(story.id, {
            plannedSessionNumber,
            completedSessionNumber: story.sessions.filter(
              (session) => session.doneDate
            ).length,
            incompletedSessionNumber: story.sessions.filter(
              (session) => !session.doneDate
            ).length,
          });
        }
        LoggingService.debug(
          `END UPDATE - ${this.service.timestamp.format(
            ProjectsServiceImpl.DATETIME_LOG_FORMAT
          )}`
        );

        LoggingService.debug(
          `START DELETE - ${this.service.timestamp.format(
            ProjectsServiceImpl.DATETIME_LOG_FORMAT
          )}`
        );
        for (const testMatrix of unupdatedTestMatrices) {
          const deleteTestMatrix = await transactionalEntityManager.findOne(
            TestMatrixEntity,
            testMatrix.id
          );
          if (!deleteTestMatrix) {
            continue;
          }
          await transactionalEntityManager.remove(deleteTestMatrix);
        }

        for (const testTargetGroup of unupdatedTestTargetGroups) {
          const deleteTestTargetGroup =
            await transactionalEntityManager.findOne(
              TestTargetGroupEntity,
              testTargetGroup.id
            );
          if (!deleteTestTargetGroup) {
            continue;
          }
          await transactionalEntityManager.remove(deleteTestTargetGroup);
        }

        for (const testTarget of unupdatedTestTargets) {
          const deleteTestTarget = await transactionalEntityManager.findOne(
            TestTargetEntity,
            testTarget.id
          );
          if (!deleteTestTarget) {
            continue;
          }
          await transactionalEntityManager.remove(deleteTestTarget);
        }

        for (const viewPoint of unupdatedViewPoints) {
          const deleteViewPoint = await transactionalEntityManager.findOne(
            ViewPointEntity,
            viewPoint.id
          );
          if (!deleteViewPoint) {
            continue;
          }
          await transactionalEntityManager.remove(deleteViewPoint);
        }

        for (const story of unupdatedStories) {
          const deleteStory = await transactionalEntityManager.findOne(
            StoryEntity,
            story.id
          );
          if (!deleteStory) {
            continue;
          }

          await transactionalEntityManager.remove(deleteStory);
        }

        for (const session of unupdatedSessions) {
          const deleteSession = await transactionalEntityManager.findOne(
            SessionEntity,
            session.id
          );
          if (!deleteSession) {
            continue;
          }
          await transactionalEntityManager.remove(deleteSession);
        }
        LoggingService.debug(
          `END DELETE - ${this.service.timestamp.format(
            ProjectsServiceImpl.DATETIME_LOG_FORMAT
          )}`
        );
      }
    );

    LoggingService.debug(
      `START ALL SELECT2 - ${this.service.timestamp.format(
        ProjectsServiceImpl.DATETIME_LOG_FORMAT
      )}`
    );

    const updatedProject = await this.getReturnProject(existsProject.id);
    LoggingService.debug(
      `START END SELECT2 - ${this.service.timestamp.format(
        ProjectsServiceImpl.DATETIME_LOG_FORMAT
      )}`
    );

    if (!updatedProject) {
      throw new Error(`Return project not found: ${existsProject.id}`);
    }

    LoggingService.debug(
      `START CONVERT - ${this.service.timestamp.format(
        ProjectsServiceImpl.DATETIME_LOG_FORMAT
      )}`
    );
    const response = this.projectEntityToResponse(updatedProject);
    LoggingService.debug(
      `END CONVERT - ${this.service.timestamp.format(
        ProjectsServiceImpl.DATETIME_LOG_FORMAT
      )}`
    );

    return response;
  }

  private async updateTestMatrix(
    transactionalEntityManager: EntityManager,
    id: string,
    name: string,
    index: number,
    existsProject: ProjectEntity,
    unupdatedList: TestMatrixEntity[]
  ): Promise<{
    testMatrixEntity: TestMatrixEntity;
    unupdatedList: TestMatrixEntity[];
  }> {
    let testMatrixEntity: TestMatrixEntity | undefined;
    let newUnupdateList: TestMatrixEntity[] = [];
    if (id) {
      testMatrixEntity = await transactionalEntityManager.findOne(
        TestMatrixEntity,
        id
      );
      if (!testMatrixEntity) {
        throw new Error(`TestMatrix not found: ${id}`);
      }
      if (testMatrixEntity.name !== name || testMatrixEntity.index !== index) {
        testMatrixEntity.name = name;
        testMatrixEntity.index = index;
        testMatrixEntity = await transactionalEntityManager.save(
          testMatrixEntity
        );
        if (!testMatrixEntity) {
          throw new Error(`Faild save testMatrix: ${id}`);
        }
      }
      newUnupdateList = unupdatedList.filter(
        (tm) => tm.id !== testMatrixEntity?.id
      );
    } else {
      testMatrixEntity = await transactionalEntityManager.save(
        new TestMatrixEntity(name, index, existsProject)
      );
    }
    return { testMatrixEntity, unupdatedList: newUnupdateList };
  }

  private async updateTestTargetGroup(
    transactionalEntityManager: EntityManager,
    id: string,
    name: string,
    index: number,
    testMatrixEntity: TestMatrixEntity,
    unupdatedList: TestTargetGroupEntity[]
  ): Promise<{
    testTargetGroupEntity: TestTargetGroupEntity;
    unupdatedList: TestTargetGroupEntity[];
  }> {
    let testTargetGroupEntity: TestTargetGroupEntity | undefined;
    if (id) {
      testTargetGroupEntity = await transactionalEntityManager.findOne(
        TestTargetGroupEntity,
        id
      );
      if (!testTargetGroupEntity) {
        throw new Error(`TestTargetGroup not found: ${id}`);
      }
      if (
        testTargetGroupEntity.name !== name ||
        testTargetGroupEntity.index !== index
      ) {
        testTargetGroupEntity.name = name;
        testTargetGroupEntity.index = index;
        testTargetGroupEntity = await transactionalEntityManager.save(
          testTargetGroupEntity
        );
        if (!testTargetGroupEntity) {
          throw new Error(`Faild save testTargetGroup: ${id}`);
        }
      }
      unupdatedList = unupdatedList.filter(
        (tm) => tm.id !== testTargetGroupEntity?.id
      );
    } else {
      const newEntity = new TestTargetGroupEntity();
      newEntity.name = name;
      newEntity.index = index;
      newEntity.testMatrix = testMatrixEntity;
      testTargetGroupEntity = await transactionalEntityManager.save(newEntity);
    }
    return { testTargetGroupEntity, unupdatedList };
  }

  private async updateTestTarget(
    transactionalEntityManager: EntityManager,
    id: string,
    name: string,
    index: number,
    plans: string,
    testTargetGroupEntity: TestTargetGroupEntity,
    unupdatedList: TestTargetEntity[]
  ): Promise<{
    testTargetEntity: TestTargetEntity;
    unupdatedList: TestTargetEntity[];
  }> {
    let testTargetEntity: TestTargetEntity | undefined;
    if (id) {
      testTargetEntity = await transactionalEntityManager.findOne(
        TestTargetEntity,
        id
      );
      if (!testTargetEntity) {
        throw new Error(`TestTarget not found: ${id}`);
      }
      if (
        testTargetEntity.name !== name ||
        testTargetEntity.text !== plans ||
        testTargetEntity.index !== index
      ) {
        testTargetEntity.name = name;
        testTargetEntity.text = plans;
        testTargetEntity.index = index;
        testTargetEntity = await transactionalEntityManager.save(
          testTargetEntity
        );
        if (!testTargetEntity) {
          throw new Error(`Faild save testTarget: ${id}`);
        }
      }
      unupdatedList = unupdatedList.filter(
        (tt) => tt.id !== testTargetEntity?.id
      );
    } else {
      const newEntity = new TestTargetEntity();
      newEntity.name = name;
      newEntity.text = plans;
      newEntity.index = index;
      newEntity.testTargetGroup = testTargetGroupEntity;
      testTargetEntity = await transactionalEntityManager.save(newEntity);
    }
    return { testTargetEntity, unupdatedList };
  }

  private async updateViewPoint(
    transactionalEntityManager: EntityManager,
    id: string | null,
    name: string,
    description: string,
    index: number,
    testMatrixEntity: TestMatrixEntity,
    unupdatedList: ViewPointEntity[]
  ): Promise<{
    viewPointEntry: ViewPointEntity;
    unupdatedList: ViewPointEntity[];
  }> {
    let viewPointEntry: ViewPointEntity | undefined;
    if (id) {
      viewPointEntry = await transactionalEntityManager.findOne(
        ViewPointEntity,
        id
      );
      if (!viewPointEntry) {
        throw new Error(`ViewPoint not found: ${id}`);
      }
      if (
        viewPointEntry.name !== name ||
        viewPointEntry.description !== description ||
        viewPointEntry.index !== index
      ) {
        viewPointEntry.name = name;
        viewPointEntry.description = description;
        viewPointEntry.index = index;
        viewPointEntry = await transactionalEntityManager.save(viewPointEntry);
        if (!viewPointEntry) {
          throw new Error(`Faild save viewPoint: ${id}`);
        }
      }
      unupdatedList = unupdatedList.filter(
        (vp) => vp.id !== viewPointEntry?.id
      );
    } else {
      const newEntry = new ViewPointEntity();
      newEntry.name = name;
      newEntry.description = description;
      newEntry.index = index;
      newEntry.testMatrices = [testMatrixEntity];
      viewPointEntry = await transactionalEntityManager.save(newEntry);
    }
    return {
      viewPointEntry,
      unupdatedList,
    };
  }

  private async createStoriesFromViewPoint(
    transactionalEntityManager: EntityManager,
    viewPoint: ViewPointEntity,
    testMatrix: TestMatrixEntity
  ): Promise<void> {
    for (const group of testMatrix.testTargetGroups) {
      for (const [index, testTarget] of group.testTargets.entries()) {
        const newStory = new StoryEntity();
        newStory.status = "out-of-scope";
        newStory.index = index;
        newStory.planedSessionNumber = 0;
        newStory.testMatrix = testMatrix;
        newStory.viewPoint = viewPoint;
        newStory.testTarget = testTarget;
        await transactionalEntityManager.save(newStory);
      }
    }
  }

  private async updateStory(
    transactionalEntityManager: EntityManager,
    id: string,
    index: number,
    status: string,
    existsStory: StoryEntity | null,
    unupdatedList: StoryEntity[]
  ): Promise<{ storyEntity: StoryEntity; unupdatedList: StoryEntity[] }> {
    if (!existsStory) {
      throw new Error("Not found existsStory.");
    }

    let updateTargetStory: StoryEntity | undefined;
    if (status !== existsStory.status) {
      updateTargetStory = await transactionalEntityManager.findOne(
        StoryEntity,
        id,
        {
          relations: ["testMatrix", "viewPoint", "testTarget"],
        }
      );
      if (!updateTargetStory) {
        throw new Error(`Story not found: ${id}`);
      }
      updateTargetStory.status = status;
      updateTargetStory.index = index;
      updateTargetStory = await transactionalEntityManager.save(
        updateTargetStory
      );
      if (!updateTargetStory) {
        throw new Error(`Faild save story: ${id}`);
      }
    } else {
      updateTargetStory = existsStory;
    }

    unupdatedList = unupdatedList.filter(
      (story) => story.id !== (existsStory as StoryEntity).id
    );

    return { storyEntity: updateTargetStory, unupdatedList };
  }

  private async updateSession(
    transactionalEntityManager: EntityManager,
    id: string,
    name: string,
    index: number,
    testUser: string,
    memo: string,
    testItem: string,
    testingTime: number,
    doneDate: string,
    story: StoryEntity,
    testResultIdentifier: { id: string; name: string }[],
    unupdatedList: SessionEntity[]
  ) {
    let updateTargetSession: SessionEntity | undefined;
    let newUnUpdatedList: SessionEntity[];
    if (id) {
      updateTargetSession = await transactionalEntityManager.findOne(
        SessionEntity,
        id,
        {
          relations: ["story", "testResult"],
        }
      );
      if (!updateTargetSession) {
        throw new Error(`Session not found: ${id}`);
      }
      updateTargetSession.name =
        name !== updateTargetSession.name ? name : updateTargetSession.name;
      updateTargetSession.testUser =
        testUser !== updateTargetSession.testUser
          ? testUser
          : updateTargetSession.testUser;
      updateTargetSession.memo =
        memo !== updateTargetSession.memo ? memo : updateTargetSession.memo;
      updateTargetSession.testItem =
        testItem !== updateTargetSession.testItem
          ? testItem
          : updateTargetSession.testItem;
      updateTargetSession.testingTime =
        testingTime !== updateTargetSession.testingTime
          ? testingTime
          : updateTargetSession.testingTime;
      updateTargetSession.doneDate =
        doneDate !== updateTargetSession.doneDate
          ? doneDate
          : updateTargetSession.doneDate;
      updateTargetSession.index =
        index !== updateTargetSession.index ? index : updateTargetSession.index;
      if (testResultIdentifier.length > 0) {
        const testResultEntity = await transactionalEntityManager.findOne(
          TestResultEntity,
          testResultIdentifier[0].id
        );
        updateTargetSession.testResult = testResultEntity;
      }
      updateTargetSession = await transactionalEntityManager.save(
        updateTargetSession
      );
      if (!updateTargetSession) {
        throw new Error(`Failed save session: ${id}`);
      }
      newUnUpdatedList = unupdatedList.filter(
        (sessionEntity) => sessionEntity.id !== id
      );
    } else {
      const newSession = new SessionEntity({
        name,
        memo,
        index,
        testItem,
        testUser,
        testingTime,
        doneDate,
        story,
      });
      updateTargetSession = await transactionalEntityManager.save(newSession);
      newUnUpdatedList = unupdatedList;
    }
    return {
      sessionEntity: updateTargetSession,
      unupdatedList: newUnUpdatedList,
    };
  }

  private async createStoriesFromTestTarget(
    transactionalEntityManager: EntityManager,
    testMatrixId: string,
    testTarget: TestTargetEntity
  ): Promise<void> {
    const testMatrix = await transactionalEntityManager.findOne(
      TestMatrixEntity,
      testMatrixId,
      {
        relations: ["viewPoints"],
      }
    );
    if (!testMatrix) {
      return;
    }
    for (const [index, viewPoint] of testMatrix.sortedViewPoint().entries()) {
      const newStory = new StoryEntity();
      newStory.status = "out-of-scope";
      newStory.index = index;
      newStory.planedSessionNumber = 0;
      newStory.testMatrix = testMatrix;
      newStory.viewPoint = viewPoint;
      newStory.testTarget = testTarget;
      await transactionalEntityManager.save(newStory);
    }
  }

  private async getReturnProject(projectId: string): Promise<ProjectEntity> {
    const projectRepository = getRepository(ProjectEntity);
    const testMatrixRepository = getRepository(TestMatrixEntity);
    const testTargetGroupRepository = getRepository(TestTargetGroupEntity);

    const updatedProject = await projectRepository.findOne(projectId, {
      relations: ["testMatrices"],
    });
    if (!updatedProject) {
      throw new Error(`Project not found: ${projectId}`);
    }
    updatedProject.testMatrices = await Promise.all(
      updatedProject?.testMatrices.map(async (testMatrix) => {
        const testMatrixWithStory = await testMatrixRepository.findOne(
          testMatrix.id,
          {
            relations: [
              "project",
              "stories",
              "stories.sessions",
              "stories.sessions.attachedFiles",
              "stories.sessions.testResult",
              "stories.sessions.testResult.notes",
              "stories.sessions.testResult.notes.testSteps",
              "stories.sessions.testResult.notes.testSteps.screenshot",
              "stories.sessions.testResult.notes.tags",
              "stories.viewPoint",
              "stories.testTarget",
            ],
          }
        );
        if (!testMatrixWithStory) {
          throw new Error();
        }
        testMatrixWithStory.testTargetGroups =
          await testTargetGroupRepository.find({
            where: { testMatrix: testMatrix.id },
            relations: ["testTargets"],
          });
        testMatrixWithStory.viewPoints = (
          await testMatrixRepository.findOne(testMatrix.id, {
            relations: ["viewPoints"],
          })
        )?.viewPoints as ViewPointEntity[];

        return testMatrixWithStory;
      })
    );
    return updatedProject;
  }

  public projectEntityToResponse(project: ProjectEntity): Project {
    const stories: Project["stories"] = [];
    for (const testMatrix of project.testMatrices) {
      for (const story of testMatrix.stories) {
        stories.push({
          id: story.id,
          testMatrixId: story.testMatrixId,
          testTargetId: story.testTargetId,
          viewPointId: story.viewPointId,
          status: story.status,
          sessions: story.sessions
            .map((session) => {
              return {
                index: session.index,
                id: session.id,
                attachedFiles:
                  session.attachedFiles
                    ?.sort((a, b) => {
                      return (a.createdDate as Date).toLocaleString() >
                        (b.createdDate as Date).toLocaleString()
                        ? 1
                        : -1;
                    })
                    .map((attachedFile) => {
                      return {
                        name: attachedFile.name,
                        fileUrl: attachedFile.fileUrl,
                      };
                    }) ?? [],
                doneDate: session.doneDate,
                isDone: !!session.doneDate,
                issues:
                  session.testResult?.notes?.map((note) => {
                    const testStep = note.testSteps
                      ? note.testSteps[0]
                      : undefined;
                    return {
                      details: note.details,
                      source: {
                        index: 0,
                        type: "notice",
                      },
                      status: note.tags?.find((tag) => {
                        return tag.name === "reported";
                      })
                        ? "reported"
                        : note.tags?.find((tag) => {
                            return tag.name === "invalid";
                          })
                        ? "invalid"
                        : "",
                      ticketId: "",
                      type: "notice",
                      value: note.value,
                      imageFilePath:
                        note.screenshot?.fileUrl ??
                        testStep?.screenshot?.fileUrl ??
                        "",
                    };
                  }) ?? [],
                memo: session.memo,
                name: session.name,
                testItem: session.testItem,
                testResultFiles: session.testResult
                  ? [
                      {
                        name: session.testResult?.name ?? "",
                        id: session.testResult?.id ?? "",
                      },
                    ]
                  : undefined,
                testerName: session.testUser,
                testingTime: session.testingTime,
              };
            })
            .sort(function (first, second) {
              if (first.index > second.index) {
                return 1;
              } else if (first.index < second.index) {
                return -1;
              } else {
                return 0;
              }
            }),
        });
      }
    }

    const ascSortFunc = (a: any, b: any) => (a.index > b.index ? 1 : -1);

    return {
      id: project.id,
      name: project.name,
      testMatrices: project.testMatrices.sort(ascSortFunc).map((testMatrix) => {
        return {
          id: testMatrix.id,
          name: testMatrix.name,
          index: testMatrix.index,
          groups: testMatrix.testTargetGroups
            .sort(ascSortFunc)
            .map((testTargetGroup) => {
              return {
                id: testTargetGroup.id,
                name: testTargetGroup.name,
                index: testTargetGroup.index,
                testTargets: testTargetGroup.testTargets
                  .sort(ascSortFunc)
                  .map((testTarget) => {
                    const plans = JSON.parse(testTarget.text) as {
                      value: number;
                      viewPointId: string;
                    }[];
                    for (const v of testMatrix.viewPoints) {
                      if (!plans.find((plan) => plan.viewPointId === v.id)) {
                        plans.push({
                          viewPointId: v.id,
                          value: 0,
                        });
                      }
                    }
                    return {
                      id: testTarget.id,
                      name: testTarget.name,
                      index: testTarget.index,
                      plans,
                    };
                  }),
              };
            }),
          viewPoints: testMatrix.sortedViewPoint().map((viewPoint) => {
            return {
              id: viewPoint.id,
              name: viewPoint.name,
              index: viewPoint.index,
              description: viewPoint.description ?? "",
            };
          }),
        };
      }),
      stories,
    };
  }
}
