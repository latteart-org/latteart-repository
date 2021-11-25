import path from "path";
import fs from "fs-extra";
import os from "os";
import moment from "moment";
import ProjectAccessor from "@/accessor/project/ProjectAccessor";
import Project, { ProjectImpl } from "@/accessor/project/Project";
import AttachedFileIO from "@/accessor/project/AttachedFileIO";

describe("ProjectAccessor", () => {
  describe("When saveProjectData is called, the test management data and related data groups are saved in the directory.", () => {
    let projectData: Project;
    let outputDirPath: string;

    beforeEach(async () => {
      const timestamp = moment().unix();
      outputDirPath = path.resolve(os.tmpdir(), `projects_${timestamp}`);

      const projectImpl = new ProjectImpl("project1", "プロジェクト1");
      projectImpl.addTestMatrices(
        ...[
          {
            id: "m000",
            name: "TM-m000",
            groups: [
              {
                id: "group1",
                name: "グループ1",
                testTargets: [
                  {
                    id: "testTarget1",
                    name: "テスト対象1",
                    plans: [{ viewPointId: "viewPoint", value: 5 }],
                  },
                ],
              },
            ],
            viewPoints: [
              {
                id: "viewPoint",
                name: "観点1",
              },
            ],
          },
        ]
      );
      projectImpl.addStories(
        ...[
          {
            id: "story1",
            status: "status1",
            sessions: [
              {
                name: "セッション1",
                id: "session1",
                isDone: true,
                doneDate: "1234567890",
                testItem: "テストアイテム1",
                testerName: "テスター1",
                memo: "メモ1",
                attachedFiles: [
                  { name: "attachedFile1", fileUrl: "", fileData: "fileData1" },
                ],
                testResultFiles: [
                  { name: "testResultFile1", id: "testResult01" },
                ],
                issues: [
                  {
                    type: "type1",
                    value: "value1",
                    details: "details1",
                    status: "status1",
                    ticketId: "ticketId1",
                    source: { type: "type1", sequence: 1, index: 0 },
                  },
                ],
                testingTime: 1234567890,
              },
            ],
          },
        ]
      );
      projectImpl.addProgressDatas(
        ...[
          {
            testMatrixId: "m000",
            testMatrixProgressDatas: [
              {
                date: "1234567890",
                groups: [
                  {
                    id: "group1",
                    name: "グループ1",
                    testTargets: [
                      {
                        id: "testTarget1",
                        name: "テスト対象1",
                        progress: {
                          planNumber: 1,
                          completedNumber: 2,
                          incompletedNumber: 3,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      );

      projectData = projectImpl;

      const accessor = new ProjectAccessor(outputDirPath);
      await accessor.saveProjectData(
        projectData.id,
        moment().unix().toString(),
        projectData
      );
    });

    afterEach(async () => {
      await fs.remove(outputDirPath);
    });

    it("normal", async () => {
      const accessor = new ProjectAccessor(outputDirPath);

      // Add file
      const expectedData: Project = JSON.parse(JSON.stringify(projectData));

      expectedData.stories[0].sessions[0].attachedFiles![0].fileUrl = expect.any(
        String
      );
      delete expectedData.stories[0].sessions[0].attachedFiles![0].fileData;
      expectedData.stories[0].sessions[0].testResultFiles![0].id =
        "testResult01";

      const { status, savedData } = await accessor.saveProjectData(
        projectData.id,
        `${moment().unix()}`,
        projectData
      );
      expect(status).toEqual("done");
      expect(savedData).toMatchObject(expectedData);

      const actualFileUrl = savedData!.stories[0].sessions[0].attachedFiles![0]
        .fileUrl;
      expect(path.dirname(actualFileUrl).split(path.sep).join("/")).toEqual(
        `${path.basename(outputDirPath)}/${
          projectData.id
        }/story1/session1/attached`
      );
      expect(path.basename(actualFileUrl)).toMatch(/[0-9]+_attachedFile1/);

      expect(
        await fs.readJSON(
          path.join(outputDirPath, projectData.id, "project.json"),
          { encoding: "utf8" }
        )
      ).toEqual(projectData);

      expect(
        await fs.pathExists(
          path.join(path.dirname(outputDirPath), actualFileUrl)
        )
      ).toBeTruthy();

      // Delete file
      projectData.stories[0].sessions[0].attachedFiles?.splice(0, 1);
      expect(
        await accessor.saveProjectData(
          projectData.id,
          `${moment().unix()}`,
          projectData
        )
      ).toEqual({
        status: "done",
        savedData: projectData,
      });

      expect(
        await fs.readJSON(
          path.join(outputDirPath, projectData.id, "project.json"),
          { encoding: "utf8" }
        )
      ).toEqual(projectData);

      expect(
        await fs.pathExists(
          path.join(path.dirname(outputDirPath), actualFileUrl)
        )
      ).toBeFalsy();
    });

    it("If it fails in the middle, roll back and return an error", async () => {
      const accessor = new ProjectAccessor(outputDirPath);

      // Add file
      const { status, savedData } = await accessor.saveProjectData(
        "project1",
        `${moment().unix()}`,
        projectData
      );

      expect(status).toEqual("done");
      expect(
        await fs.readJSON(
          path.join(outputDirPath, projectData.id, "project.json"),
          { encoding: "utf8" }
        )
      ).toEqual(savedData);

      const actualFileUrl = savedData!.stories[0].sessions[0].attachedFiles![0]
        .fileUrl;
      expect(
        await fs.pathExists(
          path.join(path.dirname(outputDirPath), actualFileUrl)
        )
      ).toBeTruthy();

      // File delete (error occurred, rollback)
      const expectedData = await accessor.readProjectData(projectData.id);

      const deleteAttachedFileSpy = jest.spyOn(
        AttachedFileIO.prototype,
        "deleteAttachedFile"
      );
      deleteAttachedFileSpy.mockRejectedValue(new Error("hogehoge"));

      projectData.stories[0].sessions[0].attachedFiles?.splice(0, 1);

      const timestamp = `${moment().unix()}`;
      expect(
        await accessor.saveProjectData("project1", timestamp, projectData)
      ).toEqual({
        status: "rollbacked",
        savedData: expectedData,
        backupInfo: {
          sourcePath: path.join(outputDirPath, projectData.id),
          backupPath: `${outputDirPath}_bak_${projectData.id}_${timestamp}`,
        },
      });

      // It has been rolled back and the file has not been deleted
      expect(
        await fs.readJSON(
          path.join(outputDirPath, projectData.id, "project.json"),
          { encoding: "utf8" }
        )
      ).toEqual(expectedData);

      expect(
        await fs.pathExists(
          path.join(path.dirname(outputDirPath), actualFileUrl)
        )
      ).toBeTruthy();

      deleteAttachedFileSpy.mockRestore();
    });

    it("If canceled in the middle, roll back and return the information indicating the cancellation.", async () => {
      const accessor = new ProjectAccessor(
        outputDirPath,
        jest
          .fn()
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(false)
          .mockReturnValue(true)
      );

      // Add file
      const { status, savedData } = await accessor.saveProjectData(
        "project1",
        `${moment().unix()}`,
        projectData
      );

      expect(status).toEqual("done");
      expect(
        await fs.readJSON(
          path.join(outputDirPath, projectData.id, "project.json"),
          { encoding: "utf8" }
        )
      ).toEqual(savedData);

      const actualFileUrl = savedData!.stories[0].sessions[0].attachedFiles![0]
        .fileUrl;
      expect(
        await fs.pathExists(
          path.join(path.dirname(outputDirPath), actualFileUrl)
        )
      ).toBeTruthy();

      // Delete file
      const expectedData = await accessor.readProjectData(projectData.id);
      projectData.stories[0].sessions[0].attachedFiles?.splice(0, 1);

      // The status is returned as canceled and savedData returns the same value as before the update
      expect(
        await accessor.saveProjectData(
          "project1",
          `${moment().unix()}`,
          projectData
        )
      ).toEqual({
        status: "canceled",
        savedData: expectedData,
      });

      // Rolled back and no files deleted
      expect(
        await fs.readJSON(
          path.join(outputDirPath, projectData.id, "project.json"),
          { encoding: "utf8" }
        )
      ).toEqual(expectedData);

      expect(
        await fs.pathExists(
          path.join(path.dirname(outputDirPath), actualFileUrl)
        )
      ).toBeTruthy();
    });
  });
});
