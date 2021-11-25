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

import { Router } from "express";
import moment from "moment";
import path from "path";
import fs from "fs-extra";
import LoggingService from "../logger/LoggingService";
import OperationHistoryService from "../accessor/test-result/OperationHistoryService";
import { SessionData } from "../accessor/test-result/SessionData";
import { SettingsUtility } from "../accessor/test-result/SettingsUtility";
import TestScriptRepositoryService from "../accessor/test-result/TestScriptRepositoryService";
import FileArchiver from "../accessor/test-result/FileArchiver";
import { publicDirPath } from "../common";
import { createCommandLineScreenshotCompressor } from "../accessor/test-result/util";
import { ServerError, ServerErrorCode } from "../ServerError";
import HistoryItemConverter from "../accessor/test-result/HistoryItemConverter";
import { JSDocRenderer } from "../accessor/test-result/gendoc/JSDocRenderer";
import { DirectoryReaderImpl } from "../accessor/test-result/DirectoryReader";
import { JSONFileIOImpl } from "../accessor/test-result/JSONFileIO";
import { TestResultFileRepository } from "../accessor/test-result/TestResultRepository";

const router = Router();

// log.json stores in memory instead of reading from a file.
const testResultStore = new Map<string, any>();

export const testResultsRootDirPath = path.join(publicDirPath, "test-results");

const repository = new TestResultFileRepository({
  rootDirPath: testResultsRootDirPath,
  testResultFileName: "log.json",
  directoryReader: new DirectoryReaderImpl(),
  jsonFileIO: new JSONFileIOImpl(),
});

router
  .route("/")
  .get(async (req, res) => {
    try {
      const testResultIdentifiers = (await repository.list()).map(
        (testResult) => testResult.identifier
      );

      res.send(testResultIdentifiers);
    } catch (error) {
      LoggingService.warn(error);
      LoggingService.warn("Test result not found.");

      res.send([]);
    }
  })
  .post(async (req, res) => {
    const testResultId = new SessionData().getSessionId();
    const name = req.body.name ?? new SessionData().getSessionId();
    const initialUrl = req.body.initialUrl ?? "";

    try {
      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultName: name,
        initialUrl,
        testResultStore,
      });
      await service.writeHistory();

      res.send({
        id: service.sessionData.getSessionId(),
        name: service.testResultName,
      });
    } catch (error) {
      LoggingService.error("Create test result failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.CREATE_TEST_RESULT_FAILED,
        message: "Create test result failed.",
      };

      res.status(500).json(serverError);
    }
  });

router
  .route("/:testResultId")
  .get(async (req, res) => {
    const testResultId = req.params.testResultId;

    try {
      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });

      service.readHistoryAndIncrementSequenceNumber();

      res.send({
        id: service.sessionData.getSessionId(),
        startTimeStamp: service.sessionData.getStartTimeStamp(),
        endTimeStamp: service.sessionData.getEndTimeStamp(),
        initialUrl: service.initialUrl,
        name: service.testResultName,
        testSteps: new HistoryItemConverter().convertToItemsWithNoteSequence(
          service.collectOperationHistoryItems()
        ),
        coverageSources: service.collectCoverageSources(),
        inputElementInfos: service.collectInputElements(),
      });
    } catch (error) {
      LoggingService.error("Get test result failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.GET_TEST_RESULT_FAILED,
        message: "Get test result failed.",
      };

      res.status(500).json(serverError);
    }
  })
  .patch(async (req, res) => {
    const testResultId = req.params.testResultId;

    try {
      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });
      service.readHistoryAndIncrementSequenceNumber();

      if (req.body.name) {
        await service.changeTestResultName(req.body.name);
      }

      res.send({
        id: service.sessionData.getSessionId(),
        startTimeStamp: service.sessionData.getStartTimeStamp(),
        endTimeStamp: service.sessionData.getEndTimeStamp(),
        initialUrl: service.initialUrl,
        name: service.testResultName,
        testSteps: new HistoryItemConverter().convertToItemsWithNoteSequence(
          service.collectOperationHistoryItems()
        ),
        coverageSources: service.collectCoverageSources(),
        inputElementInfos: service.collectInputElements(),
      });
    } catch (error) {
      LoggingService.error("Update test result failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.UPDATE_TEST_RESULT_FAILED,
        message: "Update test result failed.",
      };

      res.status(500).json(serverError);
    }
  });

router.route("/:testResultId/test-steps").post(async (req, res) => {
  const testResultId = req.params.testResultId;

  try {
    const service = new OperationHistoryService({
      outputDirPath: publicDirPath,
      testResultId,
      testResultStore,
    });

    service.readHistoryAndIncrementSequenceNumber();

    const capturedOperation = req.body;

    const registeredOperation = service.registerOperation(capturedOperation);

    res.send(registeredOperation);
  } catch (error) {
    LoggingService.error("Add test step failed.", error);

    const serverError: ServerError = {
      code: ServerErrorCode.ADD_TEST_STEP_FAILED,
      message: "Add test step failed.",
    };

    res.status(500).json(serverError);
  }
});

router
  .route("/:testResultId/test-steps/:sequence/compressed-image")
  .post(async (req, res) => {
    try {
      const testResultId = req.params.testResultId;
      const sequence = parseInt(req.params.sequence);

      const screenshotCompressor = createCommandLineScreenshotCompressor(
        SettingsUtility.getSetting("config.imageCompression.isEnabled"),
        SettingsUtility.getSetting("config.imageCompression.isDeleteSrcImage"),
        SettingsUtility.getSetting("config.imageCompression.command")
      );

      if (!screenshotCompressor) {
        throw new Error("Compression is disabled.");
      }

      const tempService = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        screenshotCompressor,
        testResultStore,
      });
      tempService.readHistoryAndIncrementSequenceNumber();

      const imageFileUrl =
        tempService.history[sequence].operation?.imageFileUrl;
      if (!imageFileUrl) {
        throw new Error(`Invalid imageFileUrl.`);
      }

      const compressedImageFileUrl = await tempService.compressionImage(
        imageFileUrl
      );

      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });
      service.readHistoryAndIncrementSequenceNumber();
      const targetOperation = service.history[sequence].operation;
      if (targetOperation) {
        targetOperation.imageFileUrl = compressedImageFileUrl as string;
      }
      service.writeHistory();

      res.send({ imageFileUrl: compressedImageFileUrl });
    } catch (error) {
      console.error(error);
      const serverError: ServerError = {
        code: ServerErrorCode.COMPRESS_TEST_STEP_IMAGE_FAILED,
        message: error.message,
      };
      res.status(500).json(serverError);
    }
  });

router
  .route("/:testResultId/test-steps/:sequence")
  .get(async (req, res) => {
    const testResultId = req.params.testResultId;

    try {
      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });
      service.readHistoryAndIncrementSequenceNumber();

      const sequence = req.params.sequence;

      const historyItem = service.history[parseInt(sequence, 10)];

      res.send({
        sequence,
        operation: historyItem.operation,
        bugs: historyItem.bugs,
        notices: historyItem.notices,
        intention: historyItem.intention,
      });
    } catch (error) {
      LoggingService.error("Get test step failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.GET_TEST_STEP_FAILED,
        message: "Get test step failed.",
      };

      res.status(500).json(serverError);
    }
  })
  .patch(async (req, res) => {
    const testResultId = req.params.testResultId;

    try {
      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });
      service.readHistoryAndIncrementSequenceNumber();

      const sequence = parseInt(req.params.sequence, 10);

      const { bugs, notices, intention } = req.body;

      if (bugs) {
        service.attachBugs(sequence, bugs);
      }
      if (notices) {
        service.attachNotices(sequence, notices);
      }
      if (intention !== undefined) {
        service.attachIntention(sequence, intention);
      }

      const historyItem = service.history[sequence];

      res.send({
        operation: historyItem.operation,
        bugs: historyItem.bugs,
        notices: historyItem.notices,
        intention: historyItem.intention,
      });
    } catch (error) {
      LoggingService.error("Edit test step failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.EDIT_TEST_STEP_FAILED,
        message: "Edit test step failed.",
      };

      res.status(500).json(serverError);
    }
  });

router.route("/:testResultId/notes").post(async (req, res) => {
  const testResultId = req.params.testResultId;

  try {
    const service = new OperationHistoryService({
      outputDirPath: publicDirPath,
      testResultId,
      testResultStore,
    });
    service.readHistoryAndIncrementSequenceNumber();

    const { type, value, details, imageData, tags } = req.body;

    const note = service.addNote({ type, value, details, imageData, tags });

    res.send({
      id: note.id,
      type: note.type,
      value: note.value,
      details: note.details,
      imageFileUrl: note.imageFileUrl,
      tags: note.tags,
    });
  } catch (error) {
    LoggingService.error("Add note failed.", error);

    const serverError: ServerError = {
      code: ServerErrorCode.ADD_NOTE_FAILED,
      message: "Add note failed.",
    };

    res.status(500).json(serverError);
  }
});

router
  .route("/:testResultId/notes/:noteId")
  .get(async (req, res) => {
    const testResultId = req.params.testResultId;
    const noteId = req.params.noteId;

    try {
      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });
      service.readHistoryAndIncrementSequenceNumber();

      const note = service.findNote(noteId);

      if (!note) {
        res.status(500).send();
        return;
      }

      res.send({
        id: note.id,
        type: note.type,
        value: note.value,
        details: note.details,
        imageFileUrl: note.imageFileUrl,
        tags: note.tags,
      });
    } catch (error) {
      LoggingService.error("Get note failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.GET_NOTE_FAILED,
        message: "Get note failed.",
      };

      res.status(500).json(serverError);
    }
  })
  .put(async (req, res) => {
    const testResultId = req.params.testResultId;
    const noteId = req.params.noteId;

    try {
      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });
      service.readHistoryAndIncrementSequenceNumber();

      const { value, details, tags } = req.body;

      const note = await service.editNote({
        id: noteId,
        value,
        details,
        tags,
      });

      if (!note) {
        res.status(500).send();
        return;
      }

      res.send({
        id: note.id,
        type: note.type,
        value: note.value,
        details: note.details,
        imageFileUrl: note.imageFileUrl,
        tags: note.tags,
      });
    } catch (error) {
      LoggingService.error("Edit note failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.EDIT_NOTE_FAILED,
        message: "Edit note failed.",
      };

      res.status(500).json(serverError);
    }
  })
  .delete(async (req, res) => {
    const testResultId = req.params.testResultId;
    const noteId = req.params.noteId;

    try {
      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });
      service.readHistoryAndIncrementSequenceNumber();

      service.deleteNote(noteId);

      res.status(204).send();
    } catch (error) {
      LoggingService.error("Delete note failed.", error);

      const serverError: ServerError = {
        code: ServerErrorCode.DELETE_NOTE_FAILED,
        message: "Delete note failed.",
      };

      res.status(500).json(serverError);
    }
  });

router
  .route("/:testResultId/notes/:noteId/compressed-image")
  .post(async (req, res) => {
    try {
      const testResultId = req.params.testResultId;
      const noteId = req.params.noteId;

      const screenshotCompressor = createCommandLineScreenshotCompressor(
        SettingsUtility.getSetting("config.imageCompression.isEnabled"),
        SettingsUtility.getSetting("config.imageCompression.isDeleteSrcImage"),
        SettingsUtility.getSetting("config.imageCompression.command")
      );

      if (!screenshotCompressor) {
        throw new Error("Compression is disabled.");
      }

      const tempService = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        screenshotCompressor,
        testResultStore,
      });

      tempService.readHistoryAndIncrementSequenceNumber();
      const note = tempService.findNote(noteId);

      if (!note || !note.imageFileUrl) {
        throw new Error("Invalid note.");
      }

      const compressedImageFileUrl = await tempService.compressionImage(
        note.imageFileUrl
      );

      const service = new OperationHistoryService({
        outputDirPath: publicDirPath,
        testResultId,
        testResultStore,
      });
      service.readHistoryAndIncrementSequenceNumber();
      const newNote = tempService.findNote(noteId);

      if (!newNote || !newNote.imageFileUrl) {
        throw new Error("Invalid note.");
      }
      newNote.imageFileUrl = compressedImageFileUrl;

      service.writeHistory();

      res.send({ imageFileUrl: compressedImageFileUrl });
    } catch (error) {
      const serverError: ServerError = {
        code: ServerErrorCode.COMPRESS_NOTE_IMAGE_FAILED,
        message: error.message,
      };
      res.status(500).json(serverError);
    }
  });

router
  .route("/:testResultId/test-scripts")
  .get(async (req, res) => {
    const testResultId = req.params.testResultId;
    const testResultDirPath = path.join(testResultsRootDirPath, testResultId);
    const testScriptsDirPath = path.join(testResultDirPath, "test-scripts");

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
    const testResultId = req.params.testResultId;
    const testResultDirPath = path.join(testResultsRootDirPath, testResultId);
    const testScriptsDirPath = path.join(testResultDirPath, "test-scripts");

    const testScripts = req.body as {
      pageObjects: Array<{ name: string; script: string }>;
      testData: Array<{ name: string; testData: string }>;
      testSuite?: { name: string; spec: string };
    };

    const service = new TestScriptRepositoryService(testScriptsDirPath);

    try {
      const timestamp = moment().format("YYYYMMDD_HHmmss");
      const result = await service.saveTestScripts(testScripts, timestamp);

      await new JSDocRenderer().render(
        result.path,
        [testResultDirPath],
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

export default router;
