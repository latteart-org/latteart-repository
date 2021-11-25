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

import OperationHistoryService from "../test-result/OperationHistoryService";
import Group from "./Group";
import Project from "./Project";

/**
 * Classes that operate reports.
 */
export default class Report {
  /**
   * Create a report from the specified project.
   * @param project  Project information
   * @param outputRootDirPath  Root directory path
   * @returns Report information
   */
  public static createFromProject(
    project: Project,
    outputRootDirPath: string
  ): Report[] {
    return project.testMatrices.map((testMatrix) => {
      const report = new Report(testMatrix.name);

      const groups = testMatrix.groups.slice();

      let groupList: Group[] = [];
      groupList = groups;

      groupList.forEach((group) => {
        group.testTargets.forEach((testTarget) => {
          testTarget.plans.forEach((plan) => {
            const storyId = `${testMatrix.id}_${plan.viewPointId}_${group.id}_${testTarget.id}`;
            const targetStory = project.stories.find((story) => {
              return story.id === storyId;
            });
            const targetViewPoint = testMatrix.viewPoints.find((viewPoint) => {
              return viewPoint.id === plan.viewPointId;
            });
            if (!targetStory || !targetStory.sessions || !targetViewPoint) {
              return;
            }

            targetStory.sessions.forEach((session) => {
              let currentIntention: any = {};

              const testResultIds =
                session.testResultFiles?.map(({ id }) => id) ?? [];

              if (testResultIds.length === 0) {
                return;
              }

              const service = new OperationHistoryService({
                outputDirPath: outputRootDirPath,
                testResultId: testResultIds[0],
                testResultStore: new Map<string, any>(),
              });
              service.readHistoryAndIncrementSequenceNumber();
              const testSteps = service.collectOperationHistoryItems();

              testSteps.forEach((operation) => {
                if (operation.intention) {
                  currentIntention = operation.intention;
                  report.addRow({
                    groupName: group.name,
                    testTargetName: testTarget.name,
                    viewPointName: targetViewPoint.name,
                    sessionName: session.name,
                    testItem: session.testItem,
                    intentionValue: currentIntention!.value,
                    intentionDetails: currentIntention!.details,
                    noticeValue: "",
                    noticeDetails: "",
                  });
                }
                const notes = [
                  ...(operation.bugs ?? []),
                  ...(operation.notices ?? []),
                ];
                notes.forEach((note) => {
                  report.addRow({
                    groupName: group.name,
                    testTargetName: testTarget.name,
                    viewPointName: targetViewPoint.name,
                    sessionName: session.name,
                    testItem: session.testItem,
                    intentionValue: currentIntention!.value,
                    intentionDetails: currentIntention!.details,
                    noticeValue: note.value,
                    noticeDetails: note.details,
                  });
                });
              });
            });
          });
        });
      });

      return report;
    });
  }

  private _name: string;

  private _header: ReportRow = {
    groupName: "GroupName",
    testTargetName: "TestTargetName",
    viewPointName: "ViewPointName",
    sessionName: "Session",
    testItem: "TestItem",
    intentionValue: "Intention",
    intentionDetails: "IntentionDetails",
    noticeValue: "Notice",
    noticeDetails: "NoticeDetails",
  };
  private _rows: ReportRow[] = [];

  get name(): string {
    return this._name;
  }

  get sanitizeName(): string {
    return this._name
      .replace(/"/g, "_")
      .replace(/</g, "_")
      .replace(/>/g, "_")
      .replace(/\|/g, "_")
      .replace(/:/g, "_")
      .replace(/\*/g, "_")
      .replace(/\?/g, "_")
      .replace(/\\/g, "_")
      .replace(/\//g, "_");
  }

  get header(): ReportRow {
    return this._header;
  }

  set header(value: ReportRow) {
    this._header = value;
  }

  get rows(): ReportRow[] {
    return this._rows;
  }

  constructor(name: string) {
    this._name = name;
  }

  public addRow(row: ReportRow): void {
    this._rows.push(row);
  }
}

interface ReportRow {
  groupName: string;
  testTargetName: string;
  viewPointName: string;
  sessionName: string;
  testItem: string;
  intentionValue: string;
  intentionDetails: string;
  noticeValue: string;
  noticeDetails: string;
}
