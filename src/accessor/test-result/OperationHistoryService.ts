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

import fs from "fs-extra";
import path from "path";
import { CapturedOperation } from "./CapturedOperation";
import { SessionData } from "./SessionData";
import { Operation } from "./Operation";
import { Note } from "./Note";
import { OperationHistoryItem } from "./OperationHistoryItem";
import { CoverageSource, InputElementInfo } from "./types";
import CoverageSourceContainer from "./CoverageSourceContainer";
import InputElementInfoContainer from "./InputElementInfoContainer";
import { ScreenshotCompressor } from "./ScreenshotCompressor";
import moment from "moment";

/**
 * A service that retains the operation history acquired by the recording tool.
 */
export default class OperationHistoryService {
  /**
   * Get operation history
   * @returns Operation history
   */
  public get history(): {
    [key: number]: {
      operation: Operation | null;
      intention: string | null;
      bugs: string[];
      notices: string[];
    };
  } {
    return this._history;
  }

  /**
   * Set operation history
   */
  public set history(value: {
    [key: number]: {
      operation: Operation | null;
      intention: string | null;
      bugs: string[];
      notices: string[];
    };
  }) {
    this._history = value;
  }

  /**
   * Get session information.
   * @returns Session information
   */
  public get sessionData(): SessionData {
    return this._sessionData;
  }

  /**
   * Get the initial URL
   * @returns URL
   */
  public get initialUrl(): string {
    return this._initialUrl;
  }

  private _sessionData: SessionData = new SessionData();
  private _error: Error | null = null;

  private _history: {
    [key: number]: {
      operation: Operation | null;
      intention: string | null;
      bugs: string[];
      notices: string[];
    };
  } = {};
  private _testResultStore: Map<string, any> | null = null;
  private _testResultSequenceStore: Map<string, number> | null = null;

  public notes: Array<Note> = [];

  private coverageSourceContainer: CoverageSourceContainer = new CoverageSourceContainer();
  private inputElementInfoContainer: InputElementInfoContainer = new InputElementInfoContainer();

  private outputDirPath: string;
  private testResultId: string;
  private _testResultName: string;
  private _initialUrl: string;
  private screenshotCompressor?: ScreenshotCompressor;

  /**
   * Get the directory path of the test result.
   * @returns Test result directory path
   */
  private get testResultDirPath() {
    return path.join(this.outputDirPath, this.testResultUrl);
  }

  /**
   * Returns the URL of the test result.
   * @returns Test result URL
   */
  private get testResultUrl() {
    return `test-results/${this.testResultId}`;
  }

  /**
   * constructor
   * @param args.outputDirPath  Output directory path
   * @param args.testResultId  Test result ID
   * @param args.testResultName  Test result name
   * @param args.initialUrl  Initial URL
   * @param args.screenshotCompressor  Screenshot compression command
   */
  constructor(args: {
    outputDirPath: string;
    testResultId: string;
    testResultName?: string;
    initialUrl?: string;
    screenshotCompressor?: ScreenshotCompressor;
    testResultStore: Map<string, any>;
  }) {
    this.outputDirPath = args.outputDirPath;
    this.testResultId = args.testResultId;
    this._testResultName = args.testResultName ?? "";
    this._initialUrl = args.initialUrl ?? "";
    this.screenshotCompressor = args.screenshotCompressor;
    this._testResultStore = args.testResultStore;

    this.startCapture();

    if (!fs.existsSync(this.testResultDirPath)) {
      fs.mkdirSync(this.testResultDirPath, { recursive: true });
    }
  }

  /**
   * Find note.
   * @param id  Note ID
   * @returns Note
   */
  public findNote(id: string): Note | undefined {
    return this.notes.find((note) => note.id === id);
  }

  /**
   * Get the test result name.
   * @returns Test result name
   */
  public get testResultName(): string {
    return this._testResultName;
  }

  public async changeTestResultName(name: string): Promise<void> {
    this._testResultName = name;

    await this.writeHistory();
  }

  /**
   * Register the driving information in the history.
   * @param operation  Operation information
   * @returns Registered operation information, coverage source and input element info.
   */
  public registerOperation(
    capturedOperation: CapturedOperation
  ): {
    operation: Operation;
    coverageSource: CoverageSource;
    inputElementInfo?: InputElementInfo;
  } {
    this.sessionData.incrementSequence();
    const sequence = this.sessionData.getSequence();

    // Screen capture file output
    const imageFileName = this.writeImage(
      `${sequence}.png`,
      capturedOperation.imageData
    );

    // History file output
    const operation = this.createOperationFromCapturedOperation({
      capturedOperation,
      sequence,
      imageFileUrl:
        imageFileName === "" ? "" : `${this.testResultUrl}/${imageFileName}`,
    });
    this.findTestStep(sequence).operation = operation;

    this.coverageSourceContainer.register({
      title: capturedOperation.title,
      url: capturedOperation.url,
      screenElements: capturedOperation.screenElements,
    });

    let capturedInputElementInfo;
    if (
      capturedOperation.inputElements !== null &&
      capturedOperation.inputElements.length !== 0
    ) {
      capturedInputElementInfo = {
        title: capturedOperation.title,
        url: capturedOperation.url,
        inputElements: capturedOperation.inputElements,
      };
      this.inputElementInfoContainer.register(capturedInputElementInfo);
    }

    this.writeHistory();

    return {
      operation,
      coverageSource: this.coverageSourceContainer.find({
        title: capturedOperation.title,
        url: capturedOperation.url,
      })!,
      inputElementInfo: capturedInputElementInfo,
    };
  }

  /**
   * Acquires element groups that are candidates for screen component coverage calculation.
   */
  public collectCoverageSources(): CoverageSource[] {
    return this.coverageSourceContainer.coverageSources;
  }

  /**
   * Acquires element groups of input element infos.
   */
  public collectInputElements(): InputElementInfo[] {
    return this.inputElementInfoContainer.inputElementInfos;
  }

  /**
   * Get the operation history in the format of OperationHistoryItem [].
   * @param sequences  Sequence number of the operation to be acquired
   * @returns Acquisition information
   */
  public collectOperationHistoryItems(
    sequences?: number[]
  ): OperationHistoryItem[] {
    const entries = Object.entries(this.history);
    const filteredEntries =
      sequences === undefined
        ? entries
        : entries.filter(([key]) => {
            return sequences.indexOf(Number(key)) !== -1;
          });

    return filteredEntries.map(([, value]) => {
      return {
        operation: value.operation,
        intention:
          this.notes.find((note) => note.id === value.intention) ?? null,
        bugs: ((bugs) => {
          if (bugs === null) {
            return bugs;
          }

          return bugs.flatMap((noteId: string) => {
            const note = this.notes.find((note) => note.id === noteId);

            if (!note) {
              return [];
            }

            return [note];
          });
        })(value.bugs),
        notices: ((notices) => {
          if (notices === null) {
            return notices;
          }
          return notices.flatMap((noteId: string) => {
            const note = this.notes.find((note) => note.id === noteId);

            if (!note) {
              return [];
            }

            return [note];
          });
        })(value.notices),
      };
    });
  }

  /**
   * Start capture.
   * @returns Capture start time
   */
  public startCapture(): number {
    let startTimeStamp;
    if (!this.sessionData.isCompletedEnd()) {
      let sequence = this.sessionData.getSequence();
      let endTime;
      while (!endTime) {
        if (sequence <= 1) {
          endTime = 0;
          break;
        }
        const lastHistory = this.history[sequence--];
        if (
          !lastHistory ||
          !lastHistory.operation ||
          !lastHistory.operation.timestamp
        ) {
          continue;
        }
        endTime = lastHistory.operation.timestamp;
      }
      startTimeStamp = this.sessionData.startSession(Number(endTime));
    } else {
      startTimeStamp = this.sessionData.startSession();
    }
    return startTimeStamp;
  }

  /**
   * End the capture.
   */
  public endCapture(): void {
    this.sessionData.endSession();
    this.writeHistory();
  }

  /**
   * Save operation history.
   */
  public async writeHistory(): Promise<void> {
    const tmpHistory: {
      [key: number]: {
        testStep: any | null;
        intention: string | null;
        bugs: string[];
        notices: string[];
      };
    } = {};

    let index = 1;
    while (this.history[index]) {
      const operation = this.history[index]!.operation;

      tmpHistory[index] = {
        testStep: operation
          ? {
              sequence: index,
              timestamp: operation.timestamp,
              imageFileUrl: operation.imageFileUrl,
              windowInfo: {
                windowHandle: operation.windowHandle,
              },
              pageInfo: {
                title: operation.title,
                url: operation.url,
                keywordTexts: operation.keywordTexts,
              },
              operation: {
                input: operation.input,
                type: operation.type,
                elementInfo: operation.elementInfo,
              },
              inputElements: operation.inputElements,
            }
          : null,
        intention: this.history[index]!.intention,
        bugs: this.history[index]!.bugs,
        notices: this.history[index]!.notices,
      };
      index++;
    }
    const writeData = {
      name: this._testResultName,
      sessionId: this.sessionData.getSessionId(),
      sequence: this.sessionData.getSequence(),
      startTimeStamp: this.sessionData.getStartTimeStamp(),
      endTimeStamp: this.sessionData.getEndTimeStamp(),
      initialUrl: this._initialUrl,
      history: tmpHistory, // this.history,
      notes: this.notes,
      coverageSources: this.collectCoverageSources(),
      inputElementInfos: this.collectInputElements(),
    };

    this._testResultStore?.set(this.testResultId, writeData);
    fs.outputJSON(path.resolve(this.testResultDirPath, "log.json"), writeData, {
      encoding: "utf-8",
    });
  }

  /**
   * Image Save image.
   * @param fileName  file name
   * @param imageData  Base64 encoded image data
   * @returns file name
   */
  public writeImage(fileName: string, imageData: string): string {
    if (fileName === "" || imageData === "") {
      return "";
    }

    const decode = Buffer.from(imageData, "base64");
    const filePath = path.resolve(this.testResultDirPath, fileName);
    fs.outputFile(filePath, decode).then(() => {
      // Image compression
      if (this.screenshotCompressor) {
        this.screenshotCompressor.compress(filePath);
      }
    });

    if (this.screenshotCompressor) {
      return this.screenshotCompressor.compressScreenshotFileName(filePath);
    }
    return fileName;
  }

  /**
   * Image compression
   * @param filePath  file path.
   */
  public async compressionImage(filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    const fullPath = path.resolve(this.testResultDirPath, fileName);
    if (this.screenshotCompressor) {
      await this.screenshotCompressor.compress(fullPath);
      const imageFileName = this.screenshotCompressor.compressScreenshotFileName(
        fullPath
      );
      return `${this.testResultUrl}/${imageFileName}`;
    }
    throw new Error("ScreenshotCompressor not found.");
  }

  /**
   * Read operation history
   */
  public readHistoryAndIncrementSequenceNumber(): void {
    const testResultData = this._testResultStore?.get(this.testResultId);

    let data;
    if (!testResultData) {
      const historyFilePath = path.resolve(this.testResultDirPath, "log.json");
      data = fs.readJSONSync(historyFilePath, { encoding: "utf8" });
    } else {
      data = testResultData;
    }

    const {
      name,
      sequence,
      startTimeStamp,
      endTimeStamp,
      history,
      notes,
      initialUrl,
      sessionId,
      coverageSources,
      inputElementInfos,
    } = data;

    this._testResultName = name;
    this._sessionData = new SessionData(
      sessionId,
      sequence,
      startTimeStamp,
      endTimeStamp
    );
    this._initialUrl = initialUrl ?? "";
    this.notes = notes;

    let index = 1;
    const tmpHistory: any = {};
    const tmpCoverageSources = new CoverageSourceContainer();
    while (history[index]) {
      const testStep = history[index].testStep;

      tmpHistory[index] = {
        operation: testStep
          ? {
              sequence: testStep.sequence,
              input: testStep.operation.input,
              type: testStep.operation.type,
              elementInfo: testStep.operation.elementInfo,
              title: testStep.pageInfo.title,
              url: testStep.pageInfo.url,
              keywordTexts: testStep.pageInfo.keywordTexts,
              screenDef: testStep.pageInfo.screenDef,
              imageFileUrl: testStep.imageFileUrl,
              screenElements: [],
              windowHandle: testStep.windowInfo.windowHandle,
              timestamp: testStep.timestamp,
              inputElements: testStep.inputElements,
            }
          : null,
        intention: history[index].intention,
        bugs: history[index].bugs,
        notices: history[index].notices,
      };

      if (testStep && testStep.pageInfo.screenElements) {
        tmpCoverageSources.register({
          title: testStep.pageInfo.title,
          url: testStep.pageInfo.url,
          screenElements: testStep.pageInfo.screenElements,
        });
      }

      index++;
    }
    this._history = tmpHistory;
    this.coverageSourceContainer =
      tmpCoverageSources.coverageSources.length > 0
        ? new CoverageSourceContainer(...tmpCoverageSources.coverageSources)
        : new CoverageSourceContainer(...(coverageSources as CoverageSource[]));

    this.inputElementInfoContainer = new InputElementInfoContainer(
      ...(inputElementInfos as InputElementInfo[])
    );
  }

  /**
   * Add a memo to the operation history.
   * @param args.type  Note type
   * @param args.value  Value
   * @param args.details  Details
   * @param args.imageData  image data
   */
  public addNote(args: {
    type: "bug" | "notice" | "intention";
    value: string;
    details?: string;
    imageData?: string;
    tags?: string[];
  }): Note {
    const id = `${args.type}_${moment().unix().toString()}`;

    // Screen capture file output
    const imageFileName = this.writeImage(
      this.buildImageFileNameOfNote(id),
      args.imageData ? args.imageData : ""
    );

    const note = new Note({
      id,
      type: args.type,
      value: args.value,
      details: args.details,
      imageFileUrl: imageFileName
        ? `${this.testResultUrl}/${imageFileName}`
        : "",
      tags: args.tags ?? [],
    });
    this.notes.push(note);

    // History file output
    this.writeHistory();

    return note;
  }

  /**
   * Edit Note
   * @param args.id  Note ID of the note to edit
   * @param args.value  Value
   * @param args.details  Details
   */
  public async editNote(args: {
    id: string;
    value?: string;
    details?: string;
    tags?: string[];
  }): Promise<Note | undefined> {
    const note = this.notes.find((note) => note.id === args.id);

    if (!note) {
      return;
    }

    if (args.value !== undefined) {
      note.value = args.value;
    }

    if (args.details !== undefined) {
      note.details = args.details;
    }

    if (args.tags !== undefined) {
      note.tags = args.tags;
    }

    // History file output
    await this.writeHistory();

    return note;
  }

  /**
   * Move bug
   * @param target.sequence  Operation history sequence associated with bug.
   * @param target.index  Bug index
   * @param newNoteId  Updated NoteId
   */
  public async moveBug(
    target: { sequence: number; index: number },
    newNoteId: string
  ): Promise<void> {
    const testStep = this.history[target.sequence];

    if (!testStep) {
      return;
    }

    if (testStep.bugs.length <= target.index) {
      return;
    }

    this.history[target.sequence].bugs[target.index] = newNoteId;

    // History file output
    await this.writeHistory();
  }

  /**
   * Move notice.
   * @param target.sequence  Operation history sequence related to notification
   * @param target.index  Notice Index after change
   * @param newNoteId  Updated NoteId
   */
  public async moveNotice(
    target: { sequence: number; index: number },
    newNoteId: string
  ): Promise<void> {
    const testStep = this.history[target.sequence];

    if (!testStep) {
      return;
    }

    if (testStep.notices.length <= target.index) {
      return;
    }

    this.history[target.sequence].notices[target.index] = newNoteId;

    // History file output
    await this.writeHistory();
  }

  /**
   * Move intention
   * @param target.sequence  Operation history sequence associated with intention
   * @param newNoteId  Updated NoteId
   */
  public async moveIntention(
    target: { sequence: number },
    newNoteId: string
  ): Promise<void> {
    const testStep = this.history[target.sequence];

    if (!testStep) {
      return;
    }

    this.history[target.sequence].intention = newNoteId;

    // History file output
    await this.writeHistory();
  }

  /**
   * Delete note.
   * @param id  Note ID of the note to be deleted
   */
  public async deleteNote(id: string): Promise<void> {
    const imageFilePath = this.buildImageFileNameOfNote(id);
    fs.removeSync(imageFilePath);

    this.notes = this.notes.filter((note) => note.id !== id);

    // History file output
    await this.writeHistory();
  }

  /**
   * Attach a bug.
   * @param sequence  Sequence of operation history to be attached.
   * @param bugIds
   */
  public attachBugs(sequence: number, bugIds: string[]): void {
    this.findTestStep(sequence).bugs = bugIds;

    // History file output
    this.writeHistory();
  }

  /**
   * Detach a bug.
   * @param sequence  Operation history sequence related to the bug
   * @param index  Index of bug to detach
   */
  public async detachBug(sequence: number, index: number): Promise<void> {
    const testStep = this.history[sequence];

    if (!testStep) {
      return;
    }

    if (testStep.bugs.length <= index) {
      return;
    }

    this.history[sequence].bugs.splice(index, 1);

    // History file output
    await this.writeHistory();
  }

  /**
   * Attach a notice.
   * @param sequence  Operation history sequence associated with notice
   * @param noticeIds
   */
  public attachNotices(sequence: number, noticeIds: string[]): void {
    this.findTestStep(sequence).notices = noticeIds;

    // History file output
    this.writeHistory();
  }

  /**
   * Detach a notice
   * @param sequence  Operation history sequence to detach notice
   * @param index  Index of notice to detach
   */
  public async detachNotice(sequence: number, index: number): Promise<void> {
    const testStep = this.history[sequence];

    if (!testStep) {
      return;
    }

    if (testStep.notices.length <= index) {
      return;
    }

    this.history[sequence].notices.splice(index, 1);

    // History file output
    await this.writeHistory();
  }

  /**
   * Attach intention.
   * @param sequence  Operation history sequence associated with intention
   * @param intentionId  intentionId
   */
  public attachIntention(sequence: number, intentionId: string): void {
    this.findTestStep(sequence).intention = intentionId;

    // History file output
    this.writeHistory();
  }

  /**
   * Detach intention.
   * @param sequence  Operation history sequence to detach intention
   */
  public async detachIntention(sequence: number): Promise<void> {
    const testStep = this.history[sequence];

    if (!testStep) {
      return;
    }

    this.history[sequence].intention = null;

    // History file output
    await this.writeHistory();
  }

  /**
   * Generate file name.
   * @param id  Note ID
   * @returns File name
   */
  private buildImageFileNameOfNote(id: string) {
    return `note_${id}.png`;
  }

  /**
   * Search the operation history of the specified sequence.
   * @param sequence  Find target sequence
   * @returns Operation history
   */
  private findTestStep(sequence: number) {
    if (this.history[sequence] === undefined) {
      this.history[sequence] = {
        operation: null,
        intention: null,
        bugs: [],
        notices: [],
      };
    }
    return this.history[sequence];
  }

  /**
   * Create an Operation from CapturedOperation.
   * @param args.capturedOperation  Original operation information
   * @param args.sequence  Newly created sequence of operation information
   * @param args.imageFileUrl  Image URL
   */
  private createOperationFromCapturedOperation(args: {
    capturedOperation: CapturedOperation;
    sequence: number;
    imageFileUrl: string;
  }): Operation {
    return new Operation(
      args.sequence,
      args.capturedOperation.input,
      args.capturedOperation.type,
      args.capturedOperation.elementInfo,
      args.capturedOperation.title,
      args.capturedOperation.url,
      args.imageFileUrl,
      args.capturedOperation.inputElements,
      args.capturedOperation.windowHandle,
      args.capturedOperation.keywordTexts
    );
  }
}
