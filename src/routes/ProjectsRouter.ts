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

import { JSDocRenderer } from "../accessor/test-result/gendoc/JSDocRenderer";
import { Router } from "express";
import fs from "fs-extra";
import moment from "moment";
import path from "path";
import Project, { ProjectImpl } from "../accessor/project/Project";
import ProjectAccessor from "../accessor/project/ProjectAccessor";
import Report from "../accessor/project/Report";
import ReportWriter from "../accessor/project/ReportWriter";
import SnapshotWriter from "../accessor/project/SnapshotWriter";
import FileArchiver from "../accessor/test-result/FileArchiver";
import {
  SettingsType,
  SettingsUtility,
} from "../accessor/test-result/SettingsUtility";
import TestScriptRepositoryService from "../accessor/test-result/TestScriptRepositoryService";
import { configFilePath, deviceConfigFilePath, publicDirPath } from "../common";
import LoggingService from "../logger/LoggingService";
import { ServerError, ServerErrorCode } from "../ServerError";
import { testResultsRootDirPath } from "./TestResultsRouter";

const router = Router();

export const projectsRootDirPath = path.join(publicDirPath, "projects");

router
  .route("/")
  .get(async (_req, res) => {
    try {
      const accessor = new ProjectAccessor(projectsRootDirPath);
      const projectIds = await accessor.collectProjectIds();

      const projects = await Promise.all(
        projectIds.map(async (projectId) => {
          const { id, name } = await accessor.readProjectData(projectId);
          return { id, name };
        })
      );

      res.send(projects);
    } catch (error) {
      LoggingService.warn("Project not found.");

      res.send([]);
    }
  })
  .post(async (req, res) => {
    try {
      // const projectId = `project_${moment().unix().toString()}`;
      const projectId = "1";
      const projectName = req.body.name ? req.body.name : projectId;

      const projectData: Project = new ProjectImpl(projectId, projectName);

      const accessor = new ProjectAccessor(projectsRootDirPath);
      const { savedData } = await accessor.saveProjectData(
        projectId,
        moment().unix().toString(),
        projectData
      );

      res.send(savedData);
    } catch (error) {
      LoggingService.error("Save project failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.SAVE_PROJECT_FAILED,
        message: "Save project failed.",
      };

      res.status(500).json(serverError);
    }
  });

router
  .route("/:projectId")
  .get(async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const accessor = new ProjectAccessor(projectsRootDirPath);
      const projectData = await accessor.readProjectData(projectId);

      res.send({
        id: projectData.id,
        name: projectData.name,
        stories: projectData.stories,
        progressDatas: projectData.progressDatas,
        testMatrices: projectData.testMatrices,
      });
    } catch (error) {
      LoggingService.error("Get project failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.GET_PROJECT_FAILED,
        message: "Get project failed.",
      };

      res.status(500).json(serverError);
    }
  })
  .put(async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const projectDataSource = req.body;

      const accessor = new ProjectAccessor(projectsRootDirPath);
      const project = await accessor.readProjectData(projectId);

      const projectData = new ProjectImpl(
        projectId,
        projectId,
        project.idGenerator
      );
      projectData.addTestMatrices(...projectDataSource.testMatrices);
      projectData.addStories(...projectDataSource.stories);
      projectData.addProgressDatas(...projectDataSource.progressDatas);

      const { savedData } = await accessor.saveProjectData(
        projectId,
        moment().unix().toString(),
        projectData
      );

      res.send({
        id: savedData!.id,
        name: savedData!.name,
        stories: savedData!.stories,
        progressDatas: savedData!.progressDatas,
        testMatrices: savedData!.testMatrices,
      });
    } catch (error) {
      LoggingService.error("Save project failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.SAVE_PROJECT_FAILED,
        message: "Save project failed.",
      };

      res.status(500).json(serverError);
    }
  });

router
  .route("/:projectId/sessions/:sessionId")
  .get(async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const sessionId = req.params.sessionId;

      const accessor = new ProjectAccessor(projectsRootDirPath);
      const project = await accessor.readProjectData(projectId);

      let response = {};
      let existsTargetSession = false;
      for (const story of project.stories) {
        for (const session of story.sessions) {
          if (session.id !== sessionId) {
            continue;
          }
          existsTargetSession = true;
          response = session;
          break;
        }
        if (existsTargetSession) {
          break;
        }
      }

      if (!existsTargetSession) {
        res.status(404).send({
          error: {
            code: ServerErrorCode.GET_SESSION,
            message: "Session not found.",
          },
        });
        return;
      }

      res.send(response);
    } catch (error) {
      const errorMessage = "Get session failed.";
      LoggingService.error(errorMessage, error);

      res.status(404).send({
        error: {
          code: ServerErrorCode.GET_SESSION,
          message: errorMessage,
        },
      });
    }
  })
  .patch(async (req, res) => {
    console.log("PATCH");
    try {
      const projectId = req.params.projectId;
      const sessionId = req.params.sessionId;
      const sessionResource = req.body;

      const accessor = new ProjectAccessor(projectsRootDirPath);
      const project = await accessor.readProjectData(projectId);

      let response = {};
      let existsTargetSession = false;
      for (const story of project.stories) {
        for (const session of story.sessions) {
          if (session.id !== sessionId) {
            continue;
          }
          existsTargetSession = true;
          if (sessionResource.attachedFiles !== undefined) {
            session.attachedFiles = sessionResource.attachedFiles;
          }
          if (sessionResource.doneDate !== undefined) {
            session.doneDate = sessionResource.doneDate;
          }
          if (sessionResource.isDone !== undefined) {
            session.isDone = sessionResource.isDone;
          }
          if (sessionResource.issues !== undefined) {
            session.issues = sessionResource.issues;
          }
          if (sessionResource.memo !== undefined) {
            session.memo = sessionResource.memo;
          }
          if (sessionResource.name !== undefined) {
            session.name = sessionResource.name;
          }
          if (sessionResource.testItem !== undefined) {
            session.testItem = sessionResource.testItem;
          }
          if (sessionResource.testResultFiles !== undefined) {
            session.testResultFiles = sessionResource.testResultFiles;
          }
          if (sessionResource.testerName !== undefined) {
            session.testerName = sessionResource.testerName;
          }
          if (sessionResource.testingTime !== undefined) {
            session.testingTime = sessionResource.testingTime;
          }
          response = session;
          break;
        }
        if (existsTargetSession) {
          break;
        }
      }

      if (!existsTargetSession) {
        res.status(404).send({
          error: {
            code: ServerErrorCode.PATCH_SESSION,
            message: "Session not found.",
          },
        });
        return;
      }

      await accessor.saveProjectData(
        projectId,
        moment().unix().toString(),
        project
      );

      res.send(response);
    } catch (error) {
      const errorMessage = "Failed to update session.";
      LoggingService.error(errorMessage, error);

      res.status(500).send({
        error: {
          code: ServerErrorCode.PATCH_SESSION,
          message: errorMessage,
        },
      });
    }
  });

router
  .route("/:projectId/configs")
  .get((_req, res) => {
    try {
      const config = SettingsUtility.settingsProvider.settings;
      res.send(config);
    } catch (error) {
      LoggingService.error("Get settings failed.", error);

      res.status(500).send({
        error: {
          code: ServerErrorCode.GET_SETTINGS_FAILED,
          message: "Get settings failed.",
        },
      });
    }
  })
  .put((req, res) => {
    const data = req.body;

    try {
      SettingsUtility.setSetting("", data);
      SettingsUtility.saveFile(configFilePath);

      const config = SettingsUtility.settingsProvider.settings;
      res.send(config);
    } catch (error) {
      LoggingService.error("Save settings failed.", error);

      res.status(500).send({
        error: {
          code: ServerErrorCode.SAVE_SETTINGS_FAILED,
          message: "Save settings failed.",
        },
      });
    }
    return {
      succeeded: true,
    };
  });

router
  .route("/:projectId/device-configs")
  .get((_req, res) => {
    try {
      const config = SettingsUtility.deviceSettingsProvider.settings;
      res.send(config);
    } catch (error) {
      LoggingService.error("Get device settings failed.", error);

      res.status(500).send({
        error: {
          code: ServerErrorCode.GET_DEVICE_SETTINGS_FAILED,
          message: "Get device settings failed.",
        },
      });
    }
  })
  .put((req, res) => {
    const data = req.body;

    try {
      SettingsUtility.setSetting("", data, SettingsType.device);
      SettingsUtility.saveFile(deviceConfigFilePath, SettingsType.device);

      const config = SettingsUtility.deviceSettingsProvider.settings;
      res.send(config);
    } catch (error) {
      LoggingService.error("Save device settings failed.", error);

      res.status(500).send({
        error: {
          code: ServerErrorCode.SAVE_DEVICE_SETTINGS_FAILED,
          message: "Save device settings failed.",
        },
      });
    }
    return {
      succeeded: true,
    };
  });

router
  .route("/:projectId/test-scripts")
  .get(async (req, res) => {
    const projectId = req.params.projectId;
    const projectDirPath = path.join(projectsRootDirPath, projectId);
    const testScriptsDirPath = path.join(projectDirPath, "test-scripts");

    try {
      const testScriptNames = await fs.promises.readdir(testScriptsDirPath);

      const testScriptUrls = testScriptNames.map((name) => {
        const testScriptPath = path.join(testScriptsDirPath, name);
        return path
          .relative(publicDirPath, testScriptPath)
          .split(path.sep)
          .join(path.posix.sep);
      });

      res.send(testScriptUrls);
    } catch (error) {
      LoggingService.warn("Test script not found.");

      res.send([]);
    }
  })
  .post(async (req, res) => {
    const projectId = req.params.projectId;
    const projectDirPath = path.join(projectsRootDirPath, projectId);
    const testScriptsDirPath = path.join(projectDirPath, "test-scripts");

    const testScripts = req.body as {
      pageObjects: Array<{ name: string; script: string }>;
      testData: Array<{ name: string; testData: string }>;
      testSuite?: { name: string; spec: string };
    };

    const service = new TestScriptRepositoryService(testScriptsDirPath);

    try {
      const timestamp = moment().format("YYYYMMDD_HHmmss");
      const result = await service.saveTestScripts(testScripts, timestamp);

      const accessor = new ProjectAccessor(projectsRootDirPath);
      const project = await accessor.readProjectData(projectId);
      const testResultDirPaths = project.stories
        .flatMap((story) => {
          return story.sessions.flatMap((session) => {
            return (
              session.testResultFiles?.flatMap(({ id }) => {
                return path.join(testResultsRootDirPath, id);
              }) ?? []
            );
          });
        })
        .filter((testResultDirPath, index, array) => {
          return array.indexOf(testResultDirPath) === index;
        });

      await new JSDocRenderer().render(
        result.path,
        testResultDirPaths,
        testResultsRootDirPath
      );

      const zipFilePath = await new FileArchiver(result.path, {
        deleteSource: true,
      }).zip();

      const testScriptUrl = path
        .relative(publicDirPath, zipFilePath)
        .split(path.sep)
        .join(path.posix.sep);

      res.send({
        url: testScriptUrl,
      });
    } catch (error) {
      LoggingService.error("Save test script failed.", error);

      res.status(500).send({
        error: {
          code: ServerErrorCode.SAVE_TEST_SCRIPT_FAILED,
          message: "Save test script failed.",
        },
      });
    }
  });

router
  .route("/:projectId/snapshots")
  .get(async (req, res) => {
    const projectId = req.params.projectId;
    const projectDirPath = path.join(projectsRootDirPath, projectId);
    const snapshotsDirPath = path.join(projectDirPath, "snapshots");

    try {
      const snapshotNames = await fs.promises.readdir(snapshotsDirPath);

      const snapshotUrls = snapshotNames.map((name) => {
        const snapshotPath = path.join(snapshotsDirPath, name);
        return path
          .relative(publicDirPath, snapshotPath)
          .split(path.sep)
          .join(path.posix.sep);
      });

      res.send(snapshotUrls);
    } catch (error) {
      LoggingService.warn("Snapshot not found.");

      res.send([]);
    }
  })
  .post(async (req, res) => {
    const projectId = req.params.projectId;
    const projectDirPath = path.join(projectsRootDirPath, projectId);

    try {
      const accessor = new ProjectAccessor(projectsRootDirPath);
      const project = await accessor.readProjectData(projectId);

      const snapshotDirPath = path.join(
        projectDirPath,
        `snapshot_${moment().format("YYYYMMDD_HHmmss")}`
      );

      await new SnapshotWriter({
        outputRootDirPath: publicDirPath,
        project: project,
        projectDirPath,
        settingsFilePath: configFilePath,
        projectFilePath: path.join(projectDirPath, "project.json"),
        testResultsRootDirPath,
      }).writeSnapshot(snapshotDirPath);

      // Report output
      const reports = Report.createFromProject(project, publicDirPath);
      for (const report of reports) {
        new ReportWriter().write(
          path.join(snapshotDirPath, `${report.sanitizeName}.xlsx`),
          report
        );
      }

      const zipFilePath = await new FileArchiver(snapshotDirPath, {
        deleteSource: true,
      }).zip();

      const snapshotUrl = path
        .relative(publicDirPath, zipFilePath)
        .split(path.sep)
        .join(path.posix.sep);

      res.send({
        url: snapshotUrl,
      });
    } catch (error) {
      LoggingService.error("Save snapshot failed.", error);

      res.status(500).send({
        error: {
          code: ServerErrorCode.SAVE_SNAPSHOT_FAILED,
          message: "Save snapshot failed.",
        },
      });
    }
  });

export default router;
