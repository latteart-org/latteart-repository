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

import path from "path";
import fs from "fs-extra";
import AttachedFileIO from "./AttachedFileIO";
import ProjectFileIO from "./ProjectFileIO";
import Project from "./Project";
import RelatedData from "./RelatedData";
import LoggingService from "../../logger/LoggingService";
import glob from "glob";
import moment from "moment";
import Session from "./Session";
import Story from "./Story";

/**
 * Class to access project information.
 */
export default class ProjectAccessor {
  private outputDirPath: string;
  private isCanceled: () => boolean;

  /**
   * constructor.
   * @param outputDirPath  File path of project information
   * @param isCanceled  The function that returns whether saving was canceled or not
   */
  constructor(outputDirPath: string, isCanceled?: () => boolean) {
    this.outputDirPath = outputDirPath;
    this.isCanceled = isCanceled ?? (() => false);
  }

  /**
   * Get the project ID of the saved project.
   * @returns Saved project IDs
   */
  public async collectProjectIds(): Promise<string[]> {
    return fs.promises.readdir(this.outputDirPath);
  }

  /**
   * Get project information.
   * @param projectId  ID of the project information you want to get
   * @returns Project information
   */
  public readProjectData(projectId: string): Promise<Project> {
    const projectPath = path.join(this.outputDirPath, projectId);
    return new ProjectFileIO(projectPath).read();
  }

  /**
   * Save project information.
   * @param projectId  Project ID of the project to save
   * @param timestamp  Save time
   * @param projectData  Project information to save
   * @returns Saved project information
   */
  public async saveProjectData(
    projectId: string,
    timestamp: string,
    projectData: Project
  ): Promise<{
    status: "done" | "canceled" | "rollbacked" | "rollbackFailed";
    savedData: Project | null;
    backupInfo?: {
      backupPath: string;
      sourcePath: string;
    };
  }> {
    let beforeProjectData;
    try {
      beforeProjectData = await this.readProjectData(projectId);
    } catch (error) {
      beforeProjectData = null;
    }

    const relatedDatas = await this.buildRelatedDatas(projectId, projectData);

    const backupTargetStoryIds = relatedDatas
      .filter((relatedData, index, array) => {
        if (
          relatedData.addedAttachedFiles.length === 0 &&
          relatedData.deletedAttachedFiles.length === 0
        ) {
          return false;
        }

        return (
          array.findIndex((item) => item.storyId === relatedData.storyId) ===
          index
        );
      })
      .map((relatedData) => {
        return relatedData.storyId;
      });

    const backupPath = `${this.outputDirPath}_bak_${projectId}_${timestamp}`;
    const makeBackupResult = await this.makeBackup(
      this.outputDirPath,
      backupPath,
      backupTargetStoryIds
    );

    if (makeBackupResult.error) {
      throw makeBackupResult.error;
    } else if (makeBackupResult.canceled) {
      LoggingService.info("Saving was interrupted.");

      await this.deleteBackup(backupPath);

      return {
        status: "canceled",
        savedData: beforeProjectData,
      };
    }

    const projectDirPath = path.join(this.outputDirPath, projectId);

    try {
      LoggingService.info(
        "Start saving test management data and related data."
      );

      // Delete / save session-related data
      for (const relatedData of relatedDatas) {
        const targetSession = projectData.stories
          .find((story) => {
            return story.id === relatedData.storyId;
          })
          ?.sessions.find((session) => {
            return session.id === relatedData.sessionId;
          });

        const sessionDirPath = path.join(
          projectDirPath,
          relatedData.storyId,
          relatedData.sessionId
        );

        if (relatedData.sessionDeleted) {
          // Delete session directory
          await fs.remove(sessionDirPath);

          continue;
        }

        const attachedFileIO = new AttachedFileIO(sessionDirPath);

        // Delete attachments
        for (const deletedAttachedFile of relatedData.deletedAttachedFiles) {
          LoggingService.info(
            `Delete attachments: ${deletedAttachedFile.path}`
          );

          if (this.isCanceled()) {
            LoggingService.info(
              "It will be suspended because it was canceled."
            );

            await this.rollback(makeBackupResult.backupFileInfos);
            await this.deleteBackup(backupPath);

            return {
              status: "canceled",
              savedData: beforeProjectData,
            };
          }

          await attachedFileIO.deleteAttachedFile(
            path.basename(deletedAttachedFile.path)
          );
        }

        // Add attachment
        for (const attachedFile of targetSession?.attachedFiles?.filter(
          ({ fileData }) => fileData
        ) ?? []) {
          LoggingService.info(`Add attachment: ${attachedFile.name}`);

          if (this.isCanceled()) {
            LoggingService.info("Saving was interrupted.");

            await this.rollback(makeBackupResult.backupFileInfos);
            await this.deleteBackup(backupPath);

            return {
              status: "canceled",
              savedData: beforeProjectData,
            };
          }

          const id = moment().unix().toString();
          const addedFilePath = await attachedFileIO.addAttachedFile(
            id,
            attachedFile.name,
            attachedFile.fileData!
          );

          // Change the path to the one after saving and delete fileData
          attachedFile.fileUrl = path
            .relative(path.dirname(this.outputDirPath), addedFilePath)
            .split(path.sep)
            .join("/");
          delete attachedFile.fileData;
        }
      }

      // Save test management data
      const testManagementDataIO = new ProjectFileIO(projectDirPath);
      await testManagementDataIO.write(projectData);

      const savedData = await testManagementDataIO.read();

      // Delete backup
      await this.deleteBackup(backupPath);

      LoggingService.info("Saving is complete.");

      return {
        status: "done",
        savedData,
      };
    } catch (error) {
      LoggingService.error("Failed to save the test management data.", error);

      try {
        await this.rollback(makeBackupResult.backupFileInfos);
        await this.deleteBackup(backupPath);
      } catch (error) {
        LoggingService.error("Rollback failed.", error);

        return {
          status: "rollbackFailed",
          savedData: beforeProjectData,
          backupInfo: {
            sourcePath: projectDirPath,
            backupPath,
          },
        };
      }

      return {
        status: "rollbacked",
        savedData: beforeProjectData,
        backupInfo: {
          sourcePath: projectDirPath,
          backupPath,
        },
      };
    }
  }

  /**
   * Backup of project information
   * @param dataDirPath  Project information path
   * @param backupDirPath  Path to save the backup
   * @param storyIds  Story ID
   */
  private async makeBackup(
    dataDirPath: string,
    backupDirPath: string,
    storyIds: string[]
  ): Promise<{
    canceled: boolean;
    backupFileInfos: Array<{ backupPath: string; sourcePath: string }>;
    error?: Error;
  }> {
    // Make a backup
    try {
      LoggingService.info(
        `Start making a backup.: ${dataDirPath} -> ${backupDirPath}`
      );
      await fs.mkdirs(dataDirPath);

      const filepathPairs = [
        ...(await new Promise<
          Array<{ backupPath: string; sourcePath: string }>
        >((resolve, reject) => {
          // Collect file paths directly under the directory.
          glob(`${dataDirPath}/*`, (error, files) => {
            if (error) {
              reject(error);
            }
            resolve(
              files
                .filter((file) => {
                  return fs.statSync(file).isFile();
                })
                .map((file) => {
                  return {
                    backupPath: path.join(
                      backupDirPath,
                      path.relative(dataDirPath, file)
                    ),
                    sourcePath: file,
                  };
                })
            );
          });
        })),
        ...(
          await Promise.all(
            storyIds.map((storyId) => {
              // Collect file paths under the charter directory.
              return new Promise<
                Array<{ backupPath: string; sourcePath: string }>
              >((resolve, reject) => {
                glob(`${dataDirPath}/${storyId}/**/*`, (error, files) => {
                  if (error) {
                    reject(error);
                  }

                  // Returns the directory path if the story directory is empty
                  if (files.length === 0) {
                    resolve([
                      {
                        backupPath: path.join(backupDirPath, storyId),
                        sourcePath: path.join(dataDirPath, storyId),
                      },
                    ]);
                  }

                  resolve(
                    files.map((file) => {
                      return {
                        backupPath: path.join(
                          backupDirPath,
                          path.relative(dataDirPath, file)
                        ),
                        sourcePath: file,
                      };
                    })
                  );
                });
              });
            })
          )
        ).flatMap((pairs) => pairs),
      ];

      for (const filepathPair of filepathPairs) {
        if (this.isCanceled()) {
          return { canceled: true, backupFileInfos: [] };
        }

        if (fs.existsSync(filepathPair.sourcePath)) {
          await fs.copy(filepathPair.sourcePath, filepathPair.backupPath);
        }
      }

      LoggingService.info("Backup creation is complete.");

      return { canceled: false, backupFileInfos: filepathPairs };
    } catch (error) {
      LoggingService.error(
        "Backup creation was interrupted because of failure.",
        error
      );

      await fs.remove(backupDirPath);

      return { canceled: false, backupFileInfos: [], error };
    }
  }

  private async deleteBackup(backupPath: string) {
    try {
      await fs.remove(backupPath);
    } catch (error) {
      LoggingService.warn(
        `Failed to delete the backup. Please delete it manually.: ${backupPath}`
      );
    }
  }

  private async rollback(
    backupFileInfos: Array<{ backupPath: string; sourcePath: string }>
  ) {
    LoggingService.info("Rollback will start.");

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 3000);
    });

    // Rollback
    for (const { backupPath, sourcePath } of backupFileInfos) {
      await fs.remove(sourcePath);

      if (fs.existsSync(backupPath)) {
        await fs.copy(backupPath, sourcePath);
      }
    }

    LoggingService.info("Rollback is complete.");
  }

  /**
   * Convert to a format to save project information.
   * @param projectId  Project ID of the project to convert
   * @param projectData  Project information
   * @returns Converted project information
   */
  private async buildRelatedDatas(
    projectId: string,
    projectData: Project
  ): Promise<RelatedData[]> {
    const relatedDatas: RelatedData[] = [];

    // Read project information before making changes
    try {
      const oldProjectData = await this.readProjectData(projectId);

      // Compare stories
      const oldStoryIds = oldProjectData.stories.map((story) => story.id);
      const newStoryIds = projectData.stories.map((story) => story.id);

      const addedStories = projectData.stories.filter(
        ({ id }) => !oldStoryIds.includes(id)
      );
      for (const addedStory of addedStories) {
        // Sessions that will be added
        relatedDatas.push(
          ...ProjectAccessor.buildAddedSessions(
            addedStory.id!,
            [],
            addedStory.sessions
          )
        );
      }

      const deletedStories = oldProjectData.stories.filter(
        ({ id }) => !newStoryIds.includes(id)
      );
      for (const deletedStory of deletedStories) {
        // Sessions that will be deleted
        relatedDatas.push(
          ...ProjectAccessor.buildDeletedSessions(
            deletedStory.id!,
            deletedStory.sessions,
            []
          )
        );
      }

      for (const story of projectData.stories) {
        const oldStory = oldProjectData.stories.find(({ id }) => {
          return id === story.id;
        });

        // Story to which a session is added
        relatedDatas.push(
          ...ProjectAccessor.buildAddedSessions(
            story.id!,
            oldStory?.sessions ?? [],
            story.sessions
          )
        );

        // Story for which the session is to be deleted
        relatedDatas.push(
          ...ProjectAccessor.buildDeletedSessions(
            story.id!,
            oldStory?.sessions ?? [],
            story.sessions
          )
        );

        if (!oldStory) {
          continue;
        }

        // Story and session remain, but attachments are added / deleted
        relatedDatas.push(
          ...ProjectAccessor.buildAddedOrDeletedAttachedFiles(oldStory, story)
        );
      }

      return relatedDatas;
    } catch (error) {
      return [];
    }
  }

  /**
   * Compare old and new story information and identify attachments to be added or deleted.
   * @param oldStory  Story information before update
   * @param newStory  Story information after update
   */
  private static buildAddedOrDeletedAttachedFiles(
    oldStory: Story,
    newStory: Story
  ) {
    return newStory.sessions.map((session) => {
      const oldSession = oldStory.sessions.find(({ id }) => {
        return id === session.id;
      });
      const oldAttachedFiles = oldSession?.attachedFiles ?? [];
      const newAttachedFiles = session.attachedFiles ?? [];

      const deletedAttachedFiles = oldAttachedFiles
        .filter((oldAttachedFile) => {
          return !(
            newAttachedFiles?.map(({ fileUrl }) => fileUrl) ?? []
          ).includes(oldAttachedFile.fileUrl);
        })
        .map((oldAttachedFile) => {
          return {
            path: oldAttachedFile.fileUrl,
            name: oldAttachedFile.name,
          };
        });

      const addedAttachedFiles = newAttachedFiles
        .filter(({ fileData }) => fileData)
        .map((file) => {
          return {
            name: file.name,
            fileData: file.fileData!,
          };
        });

      return {
        storyId: newStory.id!,
        sessionId: session.id!,
        sessionDeleted: false,
        addedAttachedFiles,
        deletedAttachedFiles,
      };
    });
  }

  /**
   * Compares old and new session information and returns the deleted session.
   * @param storyId  Target story ID
   * @param oldSessions  Session information before update
   * @param newSessions  Session information after update
   * @returns Session information to be added
   */
  private static buildAddedSessions(
    storyId: string,
    oldSessions: Session[],
    newSessions: Session[]
  ) {
    const oldSessionIds = oldSessions.map((session) => session.id) ?? [];
    const addedSessions = newSessions.filter(
      ({ id }) => !oldSessionIds.includes(id)
    );

    return addedSessions.map((addedSession) => {
      // Sessions to be added
      const addedAttachedFiles =
        addedSession.attachedFiles
          ?.filter(({ fileData }) => fileData)
          .map((file) => {
            return {
              name: file.name,
              fileData: file.fileData!,
            };
          }) ?? [];

      return {
        storyId: storyId,
        sessionId: addedSession.id!,
        sessionDeleted: false,
        addedAttachedFiles,
        deletedAttachedFiles: [],
      };
    });
  }

  /**
   * Compares old and new session information and returns the deleted session.
   * @param storyId  Target story ID
   * @param oldSessions  Session information before update
   * @param newSessions  Session information after update
   * @returns Session information to be deleted
   */
  private static buildDeletedSessions(
    storyId: string,
    oldSessions: Session[],
    newSessions: Session[]
  ) {
    const newSessionIds = newSessions.map((session) => session.id);
    const deletedSessions =
      oldSessions.filter(({ id }) => !newSessionIds.includes(id)) ?? [];

    return deletedSessions.map((deletedSession) => {
      // Story for which the session is to be deleted
      return {
        storyId,
        sessionId: deletedSession.id!,
        sessionDeleted: true,
        addedAttachedFiles: [],
        deletedAttachedFiles: [],
      };
    });
  }
}
