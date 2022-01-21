import {
  isProjectExportFile,
  isTestResultExportFile,
} from "@/lib/archiveFileTypeChecker";
import path from "path";

describe("archiveFileTypeChecker", () => {
  describe("#isProjectExportFile", () => {
    it("指定のzipファイルがプロジェクトのエクスポートファイルのファイル構造になっているか否かを返す", async () => {
      const projectExportFilePath = path.join(
        "tests",
        "resources",
        "imports",
        "project.zip"
      );
      expect(await isProjectExportFile(projectExportFilePath)).toBeTruthy();

      const testResultExportFilePath = path.join(
        "tests",
        "resources",
        "imports",
        "test_result.zip"
      );
      expect(await isProjectExportFile(testResultExportFilePath)).toBeFalsy();
    });
  });

  describe("#isProjectExportFile", () => {
    it("指定のzipファイルがテスト結果のエクスポートファイルのファイル構造になっているか否かを返す", async () => {
      const projectExportFilePath = path.join(
        "tests",
        "resources",
        "imports",
        "project.zip"
      );
      expect(await isTestResultExportFile(projectExportFilePath)).toBeFalsy();

      const testResultExportFilePath = path.join(
        "tests",
        "resources",
        "imports",
        "test_result.zip"
      );
      expect(
        await isTestResultExportFile(testResultExportFilePath)
      ).toBeTruthy();
    });
  });
});
