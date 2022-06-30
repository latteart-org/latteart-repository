import { ScreenshotEntity } from "@/entities/ScreenshotEntity";
import { TestResultEntity } from "@/entities/TestResultEntity";
import { TestStepEntity } from "@/entities/TestStepEntity";
import { ScreenshotsService } from "@/services/ScreenshotsService";
import { StaticDirectoryServiceImpl } from "@/services/StaticDirectoryService";
import { TimestampServiceImpl } from "@/services/TimestampService";
import { SqliteTestConnectionHelper } from "../../helper/TestConnectionHelper";
import { getRepository } from "typeorm";
import path from "path";
import moment from "moment";
import fs from "fs-extra";

const testConnectionHelper = new SqliteTestConnectionHelper();

const resourcesDirPath = path.join(
  path.relative(process.cwd(), path.dirname(__dirname)),
  "../",
  "resources"
);
const tempDirectoryService = new StaticDirectoryServiceImpl(
  resourcesDirPath,
  "temp"
);
const tempDirPath = path.join(resourcesDirPath, "temp");
const screenshotDirectoryService = new StaticDirectoryServiceImpl(
  resourcesDirPath,
  "screenshots"
);

beforeEach(async () => {
  await fs.mkdir(tempDirPath).catch((e) => {
    console.error(e);
  });
  await testConnectionHelper.createTestConnection({ logging: false });
});

afterEach(async () => {
  await fs.remove(tempDirPath).catch((e) => {
    console.error(e);
  });
  await testConnectionHelper.closeTestConnection();
});

describe("ScreenshotsService", () => {
  describe("#getScreenshots", () => {
    it("スクリーンショット出力", async () => {
      const testResultEntity = await getRepository(TestResultEntity).save(
        new TestResultEntity({ name: "test" })
      );

      const testStepEntity = await getRepository(TestStepEntity).save(
        new TestStepEntity({ testResult: testResultEntity })
      );

      await getRepository(ScreenshotEntity).save(
        new ScreenshotEntity({
          fileUrl: "/test.png",
          testResult: testResultEntity,
          testStep: testStepEntity,
        })
      );

      const datetime = moment().format("YYYYMMDD_HHmmss");
      const timeStampService: TimestampServiceImpl = {
        unix: jest.fn(),
        format: () => {
          return datetime;
        },
        epochMilliseconds: jest.fn(),
      };

      await new ScreenshotsService().getScreenshots(
        testResultEntity.id,
        tempDirectoryService,
        screenshotDirectoryService,
        timeStampService
      );

      const zipPath = tempDirectoryService.getJoinedPath(
        `screenshots_${testResultEntity.name}_${datetime}.zip`
      );
      await fs.stat(zipPath);
    });
  });
});
