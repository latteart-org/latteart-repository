import Group from "@/accessor/project/Group";
import Project, { ProjectImpl } from "@/accessor/project/Project";
import Report from "@/accessor/project/Report";
import ViewPoint from "@/accessor/project/ViewPoint";
import TestMatrix from "@/accessor/project/TestMatrix";
import path from "path";

describe("Report", () => {
  describe("When the static method createFromProject is called, the report information is constructed based on the passed project information.", () => {
    let projectData: Project;

    const getChaters = () => {
      return [
        {
          id: "m000_s000_g000_t000",
          status: "",
          sessions: [
            {
              name: "session1",
              testItem: "testItem1",
              testResultFiles: [{ id: "test-result1" }],
            },
          ],
        },
        {
          id: "m000_s000_g000_t001",
          status: "",
          sessions: [
            {
              name: "session1",
              testItem: "testItem2",
              testResultFiles: [{ id: "test-result2" }],
            },
          ],
        },
        {
          id: "m000_s000_g001_t000",
          status: "",
          sessions: [
            {
              name: "session1",
              testItem: "testItem3",
              testResultFiles: [{ id: "test-result3" }],
            },
          ],
        },
        {
          id: "m000_s000_g001_t001",
          status: "",
          sessions: [
            {
              name: "session1",
              testItem: "testItem4",
              testResultFiles: [{ id: "test-result4" }],
            },
            {
              name: "session2",
              testItem: "testItem5",
              testResultFiles: [{ id: "test-result5" }],
            },
          ],
        },
      ];
    };

    const getTestMatrices = (): TestMatrix[] => {
      const testTargetsA: Array<{
        id?: string;
        name: string;
        plans: Array<{ viewPointId?: string; value: number }>;
      }> = [
        {
          name: "TestTargetA-1",
          id: "t000",
          plans: [{ viewPointId: "s000", value: 1 }],
        },
        {
          name: "TestTargetA-2",
          id: "t001",
          plans: [{ viewPointId: "s000", value: 1 }],
        },
      ];
      const testTargetsB: Array<{
        id?: string;
        name: string;
        plans: Array<{ viewPointId?: string; value: number }>;
      }> = [
        {
          name: "TestTargetB-1",
          id: "t000",
          plans: [{ viewPointId: "s000", value: 1 }],
        },
        {
          name: "TestTargetB-2",
          id: "t001",
          plans: [{ viewPointId: "s000", value: 1 }],
        },
      ];
      const groupsA: Group[] = [
        { name: "Group1", id: "g000", testTargets: testTargetsA },
        { name: "Group2", id: "g001", testTargets: testTargetsB },
      ];
      const groupsB: Group[] = [];
      const viewPointsA: ViewPoint[] = [{ id: "s000", name: "viewPoint" }];
      const viewPointsB: ViewPoint[] = [];

      return [
        {
          name: "TM-m000",
          id: "m000",
          groups: groupsA,
          viewPoints: viewPointsA,
        },
        {
          name: "TM-m001",
          id: "m001",
          groups: groupsB,
          viewPoints: viewPointsB,
        },
      ];
    };

    beforeEach(() => {
      const projectImpl = new ProjectImpl("project1", "プロジェクト1");
      projectImpl.addStories(...(getChaters() as any[]));
      projectImpl.addTestMatrices(...getTestMatrices());

      projectData = projectImpl;
    });

    it("normal", () => {
      const reports = Report.createFromProject(
        projectData,
        path.join("tests", "resources", "report")
      );

      expect(reports.length).toEqual(2);

      const report = reports[0];

      expect(report.rows.length).toEqual(10);

      const header = report.header;
      expect(header.groupName).toEqual("GroupName");
      expect(header.testTargetName).toEqual("TestTargetName");
      expect(header.viewPointName).toEqual("ViewPointName");
      expect(header.sessionName).toEqual("Session");
      expect(header.testItem).toEqual("TestItem");
      expect(header.intentionValue).toEqual("Intention");
      expect(header.intentionDetails).toEqual("IntentionDetails");
      expect(header.noticeValue).toEqual("Notice");
      expect(header.noticeDetails).toEqual("NoticeDetails");

      const row1 = report.rows[0];
      expect(row1.groupName).toEqual("Group1");
      expect(row1.testTargetName).toEqual("TestTargetA-1");
      expect(row1.viewPointName).toEqual("viewPoint");
      expect(row1.sessionName).toEqual("session1");
      expect(row1.testItem).toEqual("testItem1");
      expect(row1.intentionValue).toEqual("ses1-int1");
      expect(row1.intentionDetails).toEqual("ses1-int1-details");
      expect(row1.noticeValue).toEqual("");
      expect(row1.noticeDetails).toEqual("");

      const row2 = report.rows[1];
      expect(row2.groupName).toEqual("Group1");
      expect(row2.testTargetName).toEqual("TestTargetA-1");
      expect(row2.viewPointName).toEqual("viewPoint");
      expect(row2.sessionName).toEqual("session1");
      expect(row2.testItem).toEqual("testItem1");
      expect(row2.intentionValue).toEqual("ses1-int1");
      expect(row2.intentionDetails).toEqual("ses1-int1-details");
      expect(row2.noticeValue).toEqual("ses1-bug1");
      expect(row2.noticeDetails).toEqual("ses1-bug1-details");

      const row3 = report.rows[2];
      expect(row3.groupName).toEqual("Group1");
      expect(row3.testTargetName).toEqual("TestTargetA-2");
      expect(row3.viewPointName).toEqual("viewPoint");
      expect(row3.sessionName).toEqual("session1");
      expect(row3.testItem).toEqual("testItem2");
      expect(row3.intentionValue).toEqual("ses2-int1");
      expect(row3.intentionDetails).toEqual("ses2-int1-details");
      expect(row3.noticeValue).toEqual("");
      expect(row3.noticeDetails).toEqual("");

      const row4 = report.rows[3];
      expect(row4.groupName).toEqual("Group1");
      expect(row4.testTargetName).toEqual("TestTargetA-2");
      expect(row4.viewPointName).toEqual("viewPoint");
      expect(row4.sessionName).toEqual("session1");
      expect(row4.testItem).toEqual("testItem2");
      expect(row4.intentionValue).toEqual("ses2-int1");
      expect(row4.intentionDetails).toEqual("ses2-int1-details");
      expect(row4.noticeValue).toEqual("ses2-bug1");
      expect(row4.noticeDetails).toEqual("ses2-bug1-details");

      const row5 = report.rows[4];
      expect(row5.groupName).toEqual("Group2");
      expect(row5.testTargetName).toEqual("TestTargetB-1");
      expect(row5.viewPointName).toEqual("viewPoint");
      expect(row5.sessionName).toEqual("session1");
      expect(row5.testItem).toEqual("testItem3");
      expect(row5.intentionValue).toEqual("ses3-int1");
      expect(row5.intentionDetails).toEqual("ses3-int1-details");
      expect(row5.noticeValue).toEqual("");
      expect(row5.noticeDetails).toEqual("");

      const row6 = report.rows[5];
      expect(row6.groupName).toEqual("Group2");
      expect(row6.testTargetName).toEqual("TestTargetB-1");
      expect(row6.viewPointName).toEqual("viewPoint");
      expect(row6.sessionName).toEqual("session1");
      expect(row6.testItem).toEqual("testItem3");
      expect(row6.intentionValue).toEqual("ses3-int1");
      expect(row6.intentionDetails).toEqual("ses3-int1-details");
      expect(row6.noticeValue).toEqual("ses3-bug1");
      expect(row6.noticeDetails).toEqual("ses3-bug1-details");

      const row7 = report.rows[6];
      expect(row7.groupName).toEqual("Group2");
      expect(row7.testTargetName).toEqual("TestTargetB-2");
      expect(row7.viewPointName).toEqual("viewPoint");
      expect(row7.sessionName).toEqual("session1");
      expect(row7.testItem).toEqual("testItem4");
      expect(row7.intentionValue).toEqual("ses4-int1");
      expect(row7.intentionDetails).toEqual("ses4-int1-details");
      expect(row7.noticeValue).toEqual("");
      expect(row7.noticeDetails).toEqual("");

      const row8 = report.rows[7];
      expect(row8.groupName).toEqual("Group2");
      expect(row8.testTargetName).toEqual("TestTargetB-2");
      expect(row8.viewPointName).toEqual("viewPoint");
      expect(row8.sessionName).toEqual("session1");
      expect(row8.testItem).toEqual("testItem4");
      expect(row8.intentionValue).toEqual("ses4-int1");
      expect(row8.intentionDetails).toEqual("ses4-int1-details");
      expect(row8.noticeValue).toEqual("ses4-bug1");
      expect(row8.noticeDetails).toEqual("ses4-bug1-details");

      const row9 = report.rows[8];
      expect(row9.groupName).toEqual("Group2");
      expect(row9.testTargetName).toEqual("TestTargetB-2");
      expect(row9.viewPointName).toEqual("viewPoint");
      expect(row9.sessionName).toEqual("session2");
      expect(row9.testItem).toEqual("testItem5");
      expect(row9.intentionValue).toEqual("ses5-int1");
      expect(row9.intentionDetails).toEqual("ses5-int1-details");
      expect(row9.noticeValue).toEqual("");
      expect(row9.noticeDetails).toEqual("");

      const row10 = report.rows[9];
      expect(row10.groupName).toEqual("Group2");
      expect(row10.testTargetName).toEqual("TestTargetB-2");
      expect(row10.viewPointName).toEqual("viewPoint");
      expect(row10.sessionName).toEqual("session2");
      expect(row10.testItem).toEqual("testItem5");
      expect(row10.intentionValue).toEqual("ses5-int1");
      expect(row10.intentionDetails).toEqual("ses5-int1-details");
      expect(row10.noticeValue).toEqual("ses5-notice1");
      expect(row10.noticeDetails).toEqual("ses5-notice1-details");
    });
  });
});
