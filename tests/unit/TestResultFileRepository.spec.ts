import { DirectoryReader } from "@/accessor/test-result/DirectoryReader";
import { JSONFileIO } from "@/accessor/test-result/JSONFileIO";
import { TestResultIO } from "@/accessor/test-result/TestResultIO";
import { TestResultFileRepository } from "@/accessor/test-result/TestResultRepository";

describe("TestResultFileRepository", () => {
  describe("#list", () => {
    it("有効なテスト結果へのアクセサ一覧を取得する", async () => {
      const testResultFilePaths = [`file1`, `file2`];

      const directoryReader: DirectoryReader = {
        listFilePaths: jest.fn().mockResolvedValue(testResultFilePaths),
      };

      const jsonFileIO: JSONFileIO = {
        read: jest
          .fn()
          .mockResolvedValueOnce({ sessionId: "id1", name: "name1" })
          .mockResolvedValue(null),
        write: jest.fn(),
      };

      const rootDirPath = "path/to/dir";
      const testResultFileName = "log.json";

      const repository = new TestResultFileRepository({
        rootDirPath,
        testResultFileName,
        directoryReader,
        jsonFileIO,
      });

      const testResultIOs: TestResultIO[] = await repository.list();

      expect(
        testResultIOs.map((testResultIO) => testResultIO.identifier)
      ).toEqual([{ id: "id1", name: "name1" }]);

      expect(directoryReader.listFilePaths).toBeCalledWith(rootDirPath, {
        filename: testResultFileName,
      });

      for (const testResultFilePath of testResultFilePaths) {
        expect(jsonFileIO.read).toBeCalledWith(testResultFilePath);
      }
    });
  });
});
