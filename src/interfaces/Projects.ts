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

export interface ProjectListResponse {
  id: string;
  name: string;
  createdAt: string;
}

export type GetProjectResponse = Project;
export type UpdateProjectResponse = Project;

export interface Project {
  id: string;
  name: string;
  testMatrices: {
    id: string;
    name: string;
    groups: {
      id: string;
      name: string;
      testTargets: {
        id: string;
        name: string;
        plans: {
          viewPointId: string;
          value: number;
        }[];
      }[];
    }[];
    viewPoints: {
      id: string;
      name: string;
    }[];
  }[];
  stories: StoryDetails[];
  progressDatas: ProgressData[];
}

interface StoryDetails {
  id: string;
  testMatrixId: string;
  testTargetId: string;
  viewPointId: string;
  status: string;
  sessions: {
    id: string;
    attachedFiles: {
      name: string;
      fileUrl?: string;
    }[];
    doneDate: string;
    isDone: boolean;
    issues: {
      details: string;
      source: {
        index: number;
        type: string;
      };
      status: string;
      ticketId: string;
      type: string;
      value: string;
    }[];
    memo: string;
    name: string;
    testItem: string;
    testResultFiles?: {
      name: string;
      id: string;
    }[];
    testerName: string;
    testingTime: number;
  }[];
}

export interface ProgressData {
  testMatrixId: string;
  testMatrixProgressDatas: {
    date: string;
    groups: {
      id: string;
      name: string;
      testTargets: {
        id: string;
        name: string;
        progress: {
          completedNumber: number;
          incompletedNumber: number;
          planNumber: number;
        };
      }[];
    }[];
  }[];
}

export interface CreateProjectResponse {
  testMatrices: {
    id: string;
    name: string;
    groups: {
      id: string;
      name: string;
      testTargets: {
        id: string;
        name: string;
        plans: {
          viewPointId: string;
          value: number;
        };
      }[];
    }[];
    stories: {
      id: string;
      name: string;
    }[];
  }[];
  sequences: {
    group: number;
    viewPoint: number;
    testMatrix: number;
    testTarget: number;
    session: any;
  };
}

export interface UpdateProjectDto {
  id?: string;
  name?: string;
  testMatrices: {
    id: string;
    name: string;
    groups: {
      id: string;
      name: string;
      testTargets: {
        id: string;
        name: string;
        plans: {
          viewPointId: string | null;
          value: number;
        }[];
      }[];
    }[];
    viewPoints?: {
      id: string | null;
      name: string;
    }[];
  }[];
  stories: StoryDetails[];
  progressDatas: ProgressData[];
}
