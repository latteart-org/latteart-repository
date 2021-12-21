import { CreateTestScriptDto } from "@/interfaces/TestScripts";
import { TestResultService } from "@/services/TestResultService";
import { TestScriptFileRepositoryService } from "@/services/TestScriptFileRepositoryService";
import { TestScriptsService } from "@/services/TestScriptsService";
import { SqliteTestConnectionHelper } from "../../helper/TestConnectionHelper";

const testConnectionHelper = new SqliteTestConnectionHelper();

beforeEach(async () => {
  await testConnectionHelper.createTestConnection({ logging: false });
});

afterEach(async () => {
  await testConnectionHelper.closeTestConnection();
});

describe("TestScriptsService", () => {
  describe("#createTestScriptByTestResult", () => {
    it("テスト結果単位のテストスクリプトを生成する", async () => {
      const screenshots: {
        id: string;
        fileUrl: string;
      }[] = [{ id: "id1", fileUrl: "fileUrl1" }];

      const testResultService: TestResultService = {
        getTestResultIdentifiers: jest.fn(),
        getTestResult: jest.fn(),
        createTestResult: jest.fn(),
        patchTestResult: jest.fn(),
        collectAllTestStepIds: jest.fn(),
        collectAllTestPurposeIds: jest.fn(),
        collectAllTestStepScreenshots: jest.fn().mockResolvedValue(screenshots),
      };

      const testScriptFileRepositoryService: TestScriptFileRepositoryService = {
        write: jest.fn().mockResolvedValue("url"),
      };

      const service = new TestScriptsService({
        testResult: testResultService,
        testScriptFileRepository: testScriptFileRepositoryService,
      });

      const requestBody: CreateTestScriptDto = {
        pageObjects: [
          {
            name: "",
            script: "",
          },
        ],
        testData: [
          {
            name: "",
            testData: "",
          },
        ],
        testSuite: {
          name: "",
          spec: "",
        },
        others: [{ name: "", script: "" }],
      };

      const { url } = await service.createTestScriptByTestResult(
        "testResultId",
        requestBody
      );

      expect(url).toEqual("url");
      expect(testScriptFileRepositoryService.write).toBeCalledWith(
        requestBody,
        screenshots
      );
    });
  });
});
