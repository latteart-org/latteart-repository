import OperationHistoryService from "@/accessor/test-result/OperationHistoryService";
import os from "os";
import path from "path";
import fs from "fs-extra";
import moment from "moment";
import { Operation } from "@/accessor/test-result/Operation";
import { Note } from "@/accessor/test-result/Note";
import { CapturedOperation } from "@/accessor/test-result/CapturedOperation";
import { ElementInfo } from "@/accessor/test-result/types";

describe("OperationHistoryService", () => {
  describe("When the constructor is called", () => {
    it("Initialized with an empty operation history", () => {
      const currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      const operationHistoryService = new OperationHistoryService({
        outputDirPath: currentDirPath,
        testResultId: "testResult1",
        testResultStore,
      });

      expect(Object.keys(operationHistoryService.history).length).toEqual(0);
      expect(operationHistoryService.initialUrl).toEqual("");
      expect(operationHistoryService.testResultName).toEqual("");

      removeDirRecursive(currentDirPath);
    });
  });

  describe("When readHistory is called, the operation history described in historyFilePath is restored.", () => {
    let currentDirPath: string;
    const expectedHistory = {
      operation: {
        sequence: 1,
        input: "input1",
        type: "type1",
        elementInfo: {
          attributes: {
            id: "id1",
            name: "name1",
            type: "type1",
            value: "value1",
          },
          checked: false,
          tagname: "tagname1",
          text: "text1",
          xpath: "xpath1",
        },
        title: "title1",
        url: "url1",
        screenDef: "screenDef1",
        imageFileUrl: "imageFilePath1.png",
        timestamp: "timestamp1",
        screenElements: [],
        windowHandle: "window-handle",
      },
      intention: null,
      bugs: null,
      notices: null,
    };
    const expectedCoverageSources = [
      {
        title: "title1",
        url: "url1",
        screenElements: [
          {
            attributes: {
              id: "id1",
              name: "name1",
              type: "type1",
              value: "value1",
            },
            checked: false,
            tagname: "tagname1",
            text: "text1",
            xpath: "xpath1",
          },
        ],
      },
    ];

    beforeEach(async () => {
      currentDirPath = mkTestWorkDir();
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it("normal", async () => {
      const testResultStore = new Map<string, any>();
      const operationHistoryService = new OperationHistoryService({
        outputDirPath: "./tests/resources",
        testResultId: "normal",
        testResultStore,
      });
      operationHistoryService.readHistoryAndIncrementSequenceNumber();

      expect(Object.keys(operationHistoryService.history).length).toEqual(1);
      expect(operationHistoryService.history[1]).toEqual(expectedHistory);
      expect(operationHistoryService.collectCoverageSources()).toEqual(
        expectedCoverageSources
      );

      expect(operationHistoryService.initialUrl).toEqual("hogehoge");
    });

    it("If a file that does not have initialUrl is read, set initialUrl to an empty string.", () => {
      const testResultStore = new Map<string, any>();
      const operationHistoryService = new OperationHistoryService({
        outputDirPath: "./tests/resources",
        testResultId: "no-initial-url",
        testResultStore,
      });
      operationHistoryService.readHistoryAndIncrementSequenceNumber();

      expect(Object.keys(operationHistoryService.history).length).toEqual(1);
      expect(operationHistoryService.history[1]).toEqual(expectedHistory);
      expect(operationHistoryService.collectCoverageSources()).toEqual(
        expectedCoverageSources
      );

      expect(operationHistoryService.initialUrl).toEqual("");
    });
  });

  describe("Returns the retained history information as an array of OperationHistoryItem", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it("Returns an empty array if the history information is empty", () => {
      expect(service.history).toEqual({});
      expect(service.collectOperationHistoryItems()).toEqual([]);
    });

    describe("If history information is set, convert it to an array of OperationHistoryItem and return it.", () => {
      it("normal", () => {
        service.history = {
          1: {
            operation: createTestOperation({
              title: "operation1",
              sequence: 1,
              imageFileUrl: "operationImageFilePath",
              inputElements: [],
            }),
            intention: "1",
            bugs: ["2"],
            notices: ["3"],
          },
        };

        service.notes = [
          createTestNote({
            id: "1",
            type: "intention",
            value: "intention1",
            timestamp: expect.any(String),
          }),
          createTestNote({
            id: "2",
            type: "bug",
            value: "bug1",
            imageFileUrl: "bugImageFilePath",
            timestamp: expect.any(String),
          }),
          createTestNote({
            id: "3",
            type: "notice",
            value: "notice1",
            imageFileUrl: "noticeImageFilePath",
            timestamp: expect.any(String),
          }),
        ];

        expect(service.collectOperationHistoryItems()).toMatchObject([
          {
            operation: service.history[1].operation,
            intention: service.notes[0],
            bugs: [service.notes[1]],
            notices: [service.notes[2]],
          },
        ]);
      });
    });
  });

  describe("When the registerOperation method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it("Register the operation information passed as an argument in the history and return the registered Operation", async () => {
      const capturedOperation: CapturedOperation = {
        input: "input",
        type: "type",
        elementInfo: null,
        title: "title",
        url: "url",
        screenDef: "screenDef",
        imageData: "imageData",
        screenElements: [],
        windowHandle: "",
        inputElements: [],
      };
      const registeredOperation = service.registerOperation(capturedOperation);

      expect(service.history).toMatchObject({
        1: {
          operation: createTestOperation({
            sequence: 1,
            imageFileUrl: "test-results/id1/1.png",
            timestamp: expect.any(String),
            inputElements: [],
          }),
          intention: null,
          bugs: [],
          notices: [],
        },
      });

      expect(registeredOperation).toMatchObject({
        operation: createTestOperation({
          sequence: 1,
          imageFileUrl: "test-results/id1/1.png",
          timestamp: expect.any(String),
          inputElements: [],
        }),
        coverageSource: {
          title: "title",
          url: "url",
          screenElements: [],
        },
      });
    });

    it("If imageData is an empty string, set imageFileUrl to an empty string", async () => {
      const capturedOperation: CapturedOperation = {
        input: "input",
        type: "type",
        elementInfo: null,
        title: "title",
        url: "url",
        screenDef: "screenDef",
        imageData: "",
        screenElements: [],
        windowHandle: "",
        inputElements: [],
      };
      const registeredOperation = service.registerOperation(capturedOperation);

      expect(service.history).toMatchObject({
        1: {
          operation: createTestOperation({
            sequence: 1,
            imageFileUrl: "",
            timestamp: expect.any(String),
            inputElements: [],
          }),
          intention: null,
          bugs: [],
          notices: [],
        },
      });

      expect(registeredOperation).toMatchObject({
        operation: createTestOperation({
          sequence: 1,
          imageFileUrl: "",
          timestamp: expect.any(String),
          inputElements: [],
        }),
        coverageSource: {
          title: "title",
          url: "url",
          screenElements: [],
        },
      });
    });
  });

  describe("When the addNote method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Generates and saves notes based on the specified arguments", async () => {
      expect(service.notes).toEqual([]);

      const addedNote = await service.addNote({
        type: "bug",
        value: "value",
        details: "details",
        imageData: "imageData",
      });

      expect(addedNote).toMatchObject({
        id: expect.any(String),
        type: "bug",
        value: "value",
        details: "details",
        imageFileUrl: expect.any(String),
      });

      expect(addedNote.imageFileUrl).toEqual(
        `test-results/id1/note_${addedNote.id}.png`
      );

      expect(service.notes).toEqual([addedNote]);

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {},
        notes: [addedNote],
        coverageSources: [],
      });
    });
  });

  describe("When the editNote method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it("Edit and save notes based on the specified arguments", async () => {
      service.notes = [
        new Note({
          id: "1",
          type: "bug",
        }),
      ];

      expect(service.notes[0].value).toEqual("");
      expect(service.notes[0].value).toEqual("");

      const editedNote = await service.editNote({
        id: "1",
        value: "value",
        details: "details",
      });

      expect(editedNote).toMatchObject({
        id: expect.any(String),
        type: "bug",
        value: "value",
        details: "details",
        imageFileUrl: "",
      });

      expect(service.notes[0]).toEqual(editedNote);
      /*
      const json = await fs.readJson(path.join(currentDirPath, 'test-results', 'id1', 'log.json'));
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: '',
        sequence: 0,
        initialUrl: '',
        history: {},
        notes: [editedNote],
        coverageSources: [],
      });
      */
    });
  });

  describe("When the moveBug method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Change and save the note ID of the bug associated with the specified test step", async () => {
      service.history = {
        1: {
          operation: null,
          intention: null,
          bugs: ["1", "2", "3"],
          notices: [],
        },
        2: {
          operation: null,
          intention: null,
          bugs: ["4"],
          notices: [],
        },
      };

      await service.moveBug({ sequence: 1, index: 0 }, "1b");
      await service.moveBug({ sequence: 1, index: 2 }, "3b");
      await service.moveBug({ sequence: 2, index: 0 }, "4b");

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: null,
            bugs: ["1b", "2", "3b"],
            notices: [],
          },
          2: {
            intention: null,
            bugs: ["4b"],
            notices: [],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the moveNotice method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Change and save the note ID of the notice associated with the specified test step", async () => {
      service.history = {
        1: {
          operation: null,
          intention: null,
          bugs: [],
          notices: ["1", "2", "3"],
        },
        2: {
          operation: null,
          intention: null,
          bugs: [],
          notices: ["4"],
        },
      };

      await service.moveNotice({ sequence: 1, index: 0 }, "1b");
      await service.moveNotice({ sequence: 1, index: 2 }, "3b");
      await service.moveNotice({ sequence: 2, index: 0 }, "4b");

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: null,
            bugs: [],
            notices: ["1b", "2", "3b"],
          },
          2: {
            intention: null,
            bugs: [],
            notices: ["4b"],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the moveIntention method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Change and save the intention note ID associated with the specified test step", async () => {
      service.history = {
        1: {
          operation: null,
          intention: "1",
          bugs: [],
          notices: [],
        },
        2: {
          operation: null,
          intention: "2",
          bugs: [],
          notices: [],
        },
      };

      await service.moveIntention({ sequence: 2 }, "2b");

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: "1",
            bugs: [],
            notices: [],
          },
          2: {
            intention: "2b",
            bugs: [],
            notices: [],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the deleteNote method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Delete the note with the specified ID", async () => {
      const note1 = new Note({ id: "1", type: "bug" });
      const note2 = new Note({ id: "2", type: "notice" });
      const note3 = new Note({ id: "3", type: "intention" });

      service.notes = [note1, note2, note3];

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {},
        notes: [note1, note3],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the attachBugs method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Replaces all note IDs associated with bugs in the test step with the specified sequence number", async () => {
      service.history = {
        1: {
          operation: null,
          intention: null,
          bugs: ["1", "2", "3"],
          notices: [],
        },
        2: {
          operation: null,
          intention: null,
          bugs: ["4", "5", "6"],
          notices: [],
        },
      };

      await service.attachBugs(2, ["4b", "5b", "6b"]);

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: null,
            bugs: ["1", "2", "3"],
            notices: [],
          },
          2: {
            intention: null,
            bugs: ["4b", "5b", "6b"],
            notices: [],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the detachBug method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Disassociates the specified sequence number with the bug indicated by the index value", async () => {
      service.history = {
        1: {
          operation: null,
          intention: null,
          bugs: ["1", "2", "3"],
          notices: [],
        },
        2: {
          operation: null,
          intention: null,
          bugs: ["4", "5", "6"],
          notices: [],
        },
      };

      await service.detachBug(2, 1);

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: null,
            bugs: ["1", "2", "3"],
            notices: [],
          },
          2: {
            intention: null,
            bugs: ["4", "6"],
            notices: [],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the attachNotices method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Replaces all note IDs associated with the notice of the test step with the specified sequence number", async () => {
      service.history = {
        1: {
          operation: null,
          intention: null,
          bugs: [],
          notices: ["1", "2", "3"],
        },
        2: {
          operation: null,
          intention: null,
          bugs: [],
          notices: ["4", "5", "6"],
        },
      };

      await service.attachNotices(2, ["4b", "5b", "6b"]);

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: null,
            bugs: [],
            notices: ["1", "2", "3"],
          },
          2: {
            intention: null,
            bugs: [],
            notices: ["4b", "5b", "6b"],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the detachNotice method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Break the association between the specified sequence number and the notice indicated by the index value", async () => {
      service.history = {
        1: {
          operation: null,
          intention: null,
          bugs: [],
          notices: ["1", "2", "3"],
        },
        2: {
          operation: null,
          intention: null,
          bugs: [],
          notices: ["4", "5", "6"],
        },
      };

      await service.detachNotice(2, 1);

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: null,
            bugs: [],
            notices: ["1", "2", "3"],
          },
          2: {
            intention: null,
            bugs: [],
            notices: ["4", "6"],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the attachIntention method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Replace the note ID of intention associated with the test step of the specified sequence number.", async () => {
      service.history = {
        1: {
          operation: null,
          intention: "1",
          bugs: [],
          notices: [],
        },
        2: {
          operation: null,
          intention: "2",
          bugs: [],
          notices: [],
        },
      };

      await service.attachIntention(2, "2b");

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: "1",
            bugs: [],
            notices: [],
          },
          2: {
            intention: "2b",
            bugs: [],
            notices: [],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });

  describe("When the detachIntention method is called", () => {
    let currentDirPath = "";
    let service: OperationHistoryService;

    beforeEach(() => {
      currentDirPath = mkTestWorkDir();
      const testResultStore = new Map<string, any>();
      service = new OperationHistoryService({
        testResultStore,
        outputDirPath: currentDirPath,
        testResultId: "id1",
      });
    });

    afterEach(() => {
      removeDirRecursive(currentDirPath);
    });

    it.skip("Break the association between the specified sequence number and the intention indicated by the index value", async () => {
      service.history = {
        1: {
          operation: null,
          intention: "1",
          bugs: [],
          notices: [],
        },
        2: {
          operation: null,
          intention: "2",
          bugs: [],
          notices: [],
        },
      };

      await service.detachIntention(2);

      const json = await fs.readJson(
        path.join(currentDirPath, "test-results", "id1", "log.json")
      );
      expect(json).toMatchObject({
        sessionId: expect.any(String),
        name: "",
        sequence: 0,
        initialUrl: "",
        history: {
          1: {
            intention: "1",
            bugs: [],
            notices: [],
          },
          2: {
            intention: null,
            bugs: [],
            notices: [],
          },
        },
        notes: [],
        coverageSources: [],
        inputElementInfos: [],
      });
    });
  });
});

const createTestOperation = (args: {
  sequence?: number;
  input?: string;
  type?: string;
  elementInfo?: any;
  title?: string;
  url?: string;
  imageFileUrl?: string;
  timestamp?: string;
  inputElements: ElementInfo[];
}) => {
  const newOperation = new Operation(
    args.sequence !== undefined ? args.sequence : 1,
    args.input !== undefined ? args.input : "input",
    args.type !== undefined ? args.type : "type",
    args.elementInfo !== undefined ? args.elementInfo : null,
    args.title !== undefined ? args.title : "title",
    args.url !== undefined ? args.url : "url",
    args.imageFileUrl !== undefined ? args.imageFileUrl : "imageFilePath",
    args.inputElements !== undefined ? args.inputElements : []
  );
  if (args.timestamp !== undefined) {
    newOperation.timestamp = args.timestamp;
  }
  return newOperation;
};

const createTestNote = (args: {
  id: string;
  type: "bug" | "notice" | "intention";
  value?: string;
  imageFileUrl?: string;
  timestamp?: string;
}) => {
  const newNote = new Note({
    id: args.id,
    type: args.type,
    value: args.value !== undefined ? args.value : "value",
    imageFileUrl:
      args.imageFileUrl !== undefined ? args.imageFileUrl : "imageFilePath",
  });
  if (args.timestamp !== undefined) {
    newNote.timestamp = args.timestamp;
  }
  return newNote;
};

const removeDirRecursive = (dirPath: string) => {
  return;
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        removeDirRecursive(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });
    fs.rmdirSync(dirPath);
  }
};

const mkTestWorkDir = (): string => {
  const currentDirName = moment().unix().toString();
  const currentDirPath = path.resolve(os.tmpdir(), currentDirName);
  fs.mkdirSync(currentDirPath, { recursive: true });

  return currentDirPath;
};
