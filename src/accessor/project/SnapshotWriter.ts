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
import Project from "./Project";
import path from "path";
import fs from "fs-extra";
import HistoryItemConverter from "../test-result/HistoryItemConverter";
import { Operation } from "../test-result/Operation";
import { Note } from "../test-result/Note";

/**
 * Class that outputs snapshot.
 */
export default class SnapshotWriter {
  private outputRootDirPath: string;
  private project: Project;
  private projectDirPath: string;
  private settingsFilePath: string;
  private projectFilePath: string;
  private testResultsRootDirPath: string;

  /**
   * constructor
   * @param args
   */
  constructor(args: {
    outputRootDirPath: string;
    project: Project;
    projectDirPath: string;
    settingsFilePath: string;
    projectFilePath: string;
    testResultsRootDirPath: string;
  }) {
    this.outputRootDirPath = args.outputRootDirPath;
    this.project = args.project;
    this.projectDirPath = args.projectDirPath;
    this.settingsFilePath = args.settingsFilePath;
    this.projectFilePath = args.projectFilePath;
    this.testResultsRootDirPath = args.testResultsRootDirPath;
  }

  /**
   * Snapshot output.
   * @param outputDirPath  File path to output the snapshot
   */
  public async writeSnapshot(outputDirPath: string): Promise<void> {
    const stories = this.project.stories.map((story) => {
      return {
        id: story.id,
        status: story.status,
        sessions: story.sessions.map((session) => {
          return {
            name: session.name,
            id: session.id,
            isDone: session.isDone,
            doneDate: session.doneDate,
            testItem: session.testItem,
            testerName: session.testerName,
            memo: session.memo,
            attachedFiles:
              session.attachedFiles?.map((attachedFile) => {
                return {
                  name: attachedFile.name,
                  fileUrl: `data/${story.id}/${
                    session.id
                  }/attached/${path.basename(attachedFile.fileUrl)}`,
                };
              }) ?? [],
            testResultFiles:
              session.testResultFiles === undefined
                ? undefined
                : session.testResultFiles.map((testResultFile) => {
                    return {
                      name: testResultFile.name,
                      path: testResultFile.id,
                    };
                  }),
            issues: session.issues.map((issue) => {
              return {
                type: issue.source.type,
                value: issue.value,
                details: issue.details,
                status: issue.status,
                ticketId: issue.ticketId,
                source: {
                  type: issue.source.type,
                  sequence: issue.source.sequence,
                  index: issue.source.index,
                },
              };
            }),
            intentions: (() => {
              if (
                session.testResultFiles === undefined ||
                session.testResultFiles.length === 0
              ) {
                return [];
              }

              const testResultId = session.testResultFiles[0].id;

              try {
                const service = new OperationHistoryService({
                  outputDirPath: this.outputRootDirPath,
                  testResultId,
                  testResultStore: new Map<string, any>(),
                });

                service.readHistoryAndIncrementSequenceNumber();

                return new HistoryItemConverter()
                  .convertToItemsWithNoteSequence(
                    service.collectOperationHistoryItems()
                  )
                  .flatMap(({ intention }) => {
                    if (!intention) {
                      return [];
                    }

                    return [
                      {
                        value: intention.value,
                        details: intention.details,
                      },
                    ];
                  });
              } catch (error) {
                console.log(error);
                return [];
              }
            })(),
            testingTime: session.testingTime,
          };
        }),
      };
    });

    const data = {
      testMatrices: this.project.testMatrices,
      stories,
      progressDatas: this.project.progressDatas,
    };

    // Copy the contents of "snapshot-viewer"
    const viewerTemplatePath = path.join(".", "snapshot-viewer");
    await fs.copy(viewerTemplatePath, outputDirPath);

    // Copy the contents of "history-viewer" (other than index.html)
    const historyViewerTemplatePath = path.join(".", "history-viewer");
    const cssFiles = await fs.promises.readdir(
      path.join(historyViewerTemplatePath, "css")
    );
    for (const cssFile of cssFiles) {
      await fs.copyFile(
        path.join(historyViewerTemplatePath, "css", cssFile),
        path.join(outputDirPath, "css", cssFile)
      );
    }
    const fontFiles = await fs.promises.readdir(
      path.join(historyViewerTemplatePath, "fonts")
    );
    for (const fontFile of fontFiles) {
      await fs.copyFile(
        path.join(historyViewerTemplatePath, "fonts", fontFile),
        path.join(outputDirPath, "fonts", fontFile)
      );
    }
    const jsFiles = await fs.promises.readdir(
      path.join(historyViewerTemplatePath, "js")
    );
    for (const jsFile of jsFiles) {
      await fs.copyFile(
        path.join(historyViewerTemplatePath, "js", jsFile),
        path.join(outputDirPath, "js", jsFile)
      );
    }

    // Copy project file
    const dstDataDirPath = path.join(outputDirPath, "data");
    const projectFileName = path.basename(this.projectFilePath);
    await fs.promises.mkdir(dstDataDirPath, { recursive: true });
    await fs.copyFile(
      path.join(this.projectDirPath, projectFileName),
      path.join(dstDataDirPath, projectFileName)
    );

    // Copy config file
    const dstConfPath = path.join(
      dstDataDirPath,
      `${path.basename(this.settingsFilePath, "json")}js`
    );
    const settingsData = await fs.readFile(this.settingsFilePath, "utf-8");
    await fs.writeFile(
      dstConfPath,
      `const settings = ${settingsData}`,
      "utf-8"
    );

    // Rewrite the project file
    const dstManagedDataPath = path.join(
      dstDataDirPath,
      `${path.basename(this.projectFilePath, "json")}js`
    );
    fs.writeFileSync(
      dstManagedDataPath,
      `const snapshot = ${JSON.stringify(data)}`,
      "utf-8"
    );
    const srcManagedDataPath = path.join(
      dstDataDirPath,
      path.basename(this.projectFilePath)
    );
    await fs.promises.unlink(srcManagedDataPath);

    for (const story of this.project.stories) {
      if (!story.id) {
        continue;
      }

      for (const session of story.sessions) {
        if (!session.id) {
          continue;
        }

        // Copy attachment
        if (session.attachedFiles && session.attachedFiles.length > 0) {
          const srcAttachedFilesDirPath = path.join(
            this.projectDirPath,
            story.id,
            session.id,
            "attached"
          );
          const dstAttachedFilesDirPath = path.join(
            dstDataDirPath,
            story.id,
            session.id,
            "attached"
          );
          await fs.promises.mkdir(dstAttachedFilesDirPath, { recursive: true });

          for (const attachedFile of session.attachedFiles) {
            const attachedFileName = path.basename(attachedFile.fileUrl);
            await fs.copyFile(
              path.join(srcAttachedFilesDirPath, attachedFileName),
              path.join(dstAttachedFilesDirPath, attachedFileName)
            );
          }
        }

        // Copy test results
        if (session.testResultFiles && session.testResultFiles.length > 0) {
          const dstSessionPath = path.join(
            dstDataDirPath,
            story.id!,
            session.id!
          );

          // Copy the set of test result directories
          const srcTestResultPath = path.join(
            this.testResultsRootDirPath,
            session.testResultFiles[0].id
          );
          const dstTestResultPath = path.join(dstSessionPath, "testResult");
          const testResultFiles = await fs.promises.readdir(srcTestResultPath);

          if (testResultFiles.length > 0) {
            await fs.promises.mkdir(dstTestResultPath, { recursive: true });
          }

          for (const testResultFile of testResultFiles) {
            const testResultFilePath = path.join(
              srcTestResultPath,
              testResultFile
            );
            if ((await fs.promises.stat(testResultFilePath)).isDirectory()) {
              continue;
            }

            await fs.copyFile(
              testResultFilePath,
              path.join(dstTestResultPath, testResultFile)
            );
          }

          // Converts the test result file and outputs it
          const dstHistoryLogPath = path.join(dstTestResultPath, "log.js");

          const service = new OperationHistoryService({
            outputDirPath: this.outputRootDirPath,
            testResultId: session.testResultFiles[0].id,
            testResultStore: new Map<string, any>(),
          });
          service.readHistoryAndIncrementSequenceNumber();

          const convertedHistoryLog = {
            history: new HistoryItemConverter().convertToItemsWithNoteSequence(
              service.collectOperationHistoryItems().map((item) => {
                return {
                  operation: item.operation
                    ? Operation.createFromOtherOperation({
                        other: item.operation,
                        overrideParams: {
                          imageFileUrl: path.join(
                            "testResult",
                            path.basename(item.operation.imageFileUrl ?? "")
                          ),
                        },
                      })
                    : null,
                  bugs:
                    item.bugs?.map((bug) => {
                      return Note.createFromOtherNote({
                        other: bug,
                        overrideParams: {
                          imageFileUrl: path.join(
                            "testResult",
                            path.basename(bug.imageFileUrl ?? "")
                          ),
                        },
                      });
                    }) ?? [],
                  notices:
                    item.notices?.map((notice) => {
                      return Note.createFromOtherNote({
                        other: notice,
                        overrideParams: {
                          imageFileUrl: path.join(
                            "testResult",
                            path.basename(notice.imageFileUrl ?? "")
                          ),
                        },
                      });
                    }) ?? [],
                  intention: item.intention,
                };
              })
            ),
            coverageSources: service.collectCoverageSources(),
            inputElementInfos: service.collectInputElements(),
          };

          fs.writeFileSync(
            dstHistoryLogPath,
            `const historyLog = ${JSON.stringify(convertedHistoryLog)}`,
            "utf-8"
          );

          const srcHistoryLogPath = path.join(dstTestResultPath, "log.json");
          await fs.unlink(srcHistoryLogPath);

          // Copy index.html of history-viewer
          await fs.copyFile(
            path.join("history-viewer", "index.html"),
            path.join(dstSessionPath, "index.html")
          );
        }
      }
    }
  }
}
