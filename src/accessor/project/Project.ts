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

import Story from "./Story";
import ProgressData from "./ProgressData";
import TestMatrix from "./TestMatrix";

export default interface Project {
  idGenerator: IdGenerator;
  id: string;
  name: string;
  testMatrices: TestMatrix[];
  stories: Story[];
  progressDatas: ProgressData[];
}

/**
 * Project information.
 */
export class ProjectImpl implements Project {
  public idGenerator: IdGenerator;
  public id: string;
  public name: string;
  public testMatrices: TestMatrix[] = [];
  public stories: Story[] = [];
  public progressDatas: ProgressData[] = [];

  /**
   * constructor.
   * @param id  Project ID
   * @param name  Project name
   * @param idGenerator
   */
  constructor(id: string, name: string, idGenerator?: IdGenerator) {
    this.id = id;
    this.name = name;
    this.idGenerator = idGenerator ?? new IdGenerator();
  }

  /**
   * Add test matcices.
   * @param testMatrices  Test matrix to add
   */
  public addTestMatrices(...testMatrices: TestMatrix[]): void {
    this.testMatrices.push(
      ...testMatrices.map((testMatrix) => {
        const viewPoints = testMatrix.viewPoints.map((viewPoint) => {
          return {
            id: viewPoint.id
              ? viewPoint.id
              : this.idGenerator.generateViewPointId(),
            name: viewPoint.name,
          };
        });

        return {
          id: testMatrix.id
            ? testMatrix.id
            : this.idGenerator.generateTestMatrixId(),
          name: testMatrix.name,
          groups: testMatrix.groups.map((group) => {
            return {
              id: group.id ? group.id : this.idGenerator.generateGroupId(),
              name: group.name,
              testTargets: group.testTargets.map((testTarget) => {
                return {
                  id: testTarget.id
                    ? testTarget.id
                    : this.idGenerator.generateTestTargetId(),
                  name: testTarget.name,
                  plans: testTarget.plans.map((plan, index) => {
                    return {
                      viewPointId: plan.viewPointId ?? viewPoints[index].id,
                      value: plan.value,
                    };
                  }),
                };
              }),
            };
          }),
          viewPoints,
        };
      })
    );
  }

  /**
   * Add stories.
   * @param stories  Story to add
   */
  public addStories(...stories: Story[]): void {
    this.stories.push(
      ...stories.map((story) => {
        return {
          id: story.id ? story.id : this.idGenerator.generateStoryId(),
          status: story.status,
          sessions: story.sessions.map((session) => {
            const newId = session.id
              ? session.id
              : this.idGenerator.generateSessionId();
            const newName = session.name ? session.name : newId;
            return {
              attachedFiles: session.attachedFiles,
              doneDate: session.doneDate,
              id: newId,
              isDone: session.isDone,
              issues: session.issues,
              memo: session.memo,
              name: newName,
              testItem: session.testItem,
              testResultFiles: session.testResultFiles,
              testerName: session.testerName,
              testingTime: session.testingTime,
            };
          }),
        };
      })
    );
  }

  /**
   * Add progress datas.
   * @param progressDatas  Progress data to add
   */
  public addProgressDatas(...progressDatas: ProgressData[]): void {
    this.progressDatas.push(...progressDatas);
  }
}

interface ManagedSequences {
  viewPoint: number;
  testMatrix: number;
  group: number;
  testTarget: number;
  story: number;
  session: number;
}

/**
 * A class that generates a unique ID.
 */
export class IdGenerator {
  public sequences: ManagedSequences;

  /**
   * constructor.
   * @param sequences  Init value
   */
  constructor(sequences?: ManagedSequences) {
    this.sequences = sequences ?? {
      viewPoint: 1,
      testMatrix: 1,
      group: 1,
      testTarget: 1,
      story: 1,
      session: 1,
    };
  }

  /**
   * Create a viewPoint ID.
   * @returns ViewPoint ID
   */
  public generateViewPointId(): string {
    const id = this.sequences.viewPoint;

    this.sequences.viewPoint++;

    return id.toString();
  }

  /**
   * Create a test matrix ID.
   * @returns Test matrix ID
   */
  public generateTestMatrixId(): string {
    const id = this.sequences.testMatrix;

    this.sequences.testMatrix++;

    return id.toString();
  }

  /**
   * Create a group ID.
   * @returns Group ID
   */
  public generateGroupId(): string {
    const id = this.sequences.group;

    this.sequences.group++;

    return id.toString();
  }

  /**
   * Create a test target ID.
   * @returns Test target ID
   */
  public generateTestTargetId(): string {
    const id = this.sequences.testTarget;

    this.sequences.testTarget++;

    return id.toString();
  }

  /**
   * Create a story ID.
   * @returns Story ID
   */
  public generateStoryId(): string {
    const id = this.sequences.story;

    this.sequences.story++;

    return id.toString();
  }

  /**
   * Create a session ID.
   * @returns Session ID
   */
  public generateSessionId(): string {
    const id = this.sequences.session;

    this.sequences.session++;

    return id.toString();
  }
}
