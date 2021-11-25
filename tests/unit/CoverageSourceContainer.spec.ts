import CoverageSourceContainer from "@/accessor/test-result/CoverageSourceContainer";
import { SettingsUtility } from "@/accessor/test-result/SettingsUtility";
import path from "path";

describe("CoverageSourceContainer", () => {
  let container: CoverageSourceContainer;
  describe("When register is called, the screen information passed as an argument is registered in its own field.", () => {
    describe("Determine if the screens are the same by the title and URL of the screen information,", () => {
      it("When the registration is the first time, register screen information in its own field.", () => {
        container = new CoverageSourceContainer();
        const pageInfo = {
          title: "title01",
          url: "url01",
          screenElements: [
            {
              tagname: "tag01",
              text: "text01",
              xpath: "xpath01",
              checked: false,
              attributes: { id: "id01" },
            },
            {
              tagname: "tag02",
              text: "text02",
              xpath: "xpath02",
              checked: true,
              attributes: { id: "id02", class: "class02" },
            },
          ],
        };

        // Test run
        container.register(pageInfo);
        // Confirmation of execution result
        const ret = container.find({
          title: pageInfo.title,
          url: pageInfo.url,
        });
        if (ret) {
          expect(ret.screenElements).toMatchObject(pageInfo.screenElements);
        } else {
          expect(ret).not.toBeUndefined();
        }
      });
      it("When you register information with the same title and URL as a registered one, only the difference is additionally registered to the existing information in the field.", () => {
        container = new CoverageSourceContainer();
        const pageInfo1 = {
          title: "title03",
          url: "url03",
          screenElements: [
            {
              tagname: "tag03",
              text: "text03",
              xpath: "xpath03",
              attributes: { id: "id03" },
            },
            {
              tagname: "tag04",
              text: "text04",
              xpath: "xpath04",
              checked: true,
              attributes: { id: "id04", class: "class04" },
            },
          ],
        };
        const pageInfo2 = {
          title: "title03",
          url: "url03",
          screenElements: [
            {
              tagname: "tag04",
              text: "text04",
              xpath: "xpath04",
              checked: true,
              attributes: { id: "id04", class: "class04" },
            },
            {
              tagname: "tag05",
              text: "text05",
              xpath: "xpath05",
              attributes: { id: "id05", class: "class05" },
            },
          ],
        };

        // Test run
        container.register(pageInfo1);
        container.register(pageInfo2);
        // Confirmation of execution result
        const ret = container.find({
          title: pageInfo1.title,
          url: pageInfo1.url,
        });
        if (ret) {
          expect(ret.screenElements).toMatchObject([
            pageInfo1.screenElements[0],
            pageInfo2.screenElements[0],
            pageInfo2.screenElements[1],
          ]);
        } else {
          expect(ret).not.toBeUndefined();
        }
      });
      it("When you register screen information that have the same title as the registered screen information but different URL from them, it will be registered as a new screen in the field.", () => {
        container = new CoverageSourceContainer();
        const pageInfo1 = {
          title: "title04",
          url: "url04",
          screenElements: [
            {
              tagname: "tag06",
              text: "text06",
              xpath: "xpath06",
              attributes: { id: "id06" },
            },
          ],
        };
        const pageInfo2 = {
          title: "title04",
          url: "url05",
          screenElements: [
            {
              tagname: "tag06",
              text: "text06",
              xpath: "xpath06",
              attributes: { id: "id06" },
            },
          ],
        };

        // Test run
        container.register(pageInfo1);
        container.register(pageInfo2);
        // Confirmation of execution result
        const ret1 = container.find({
          title: pageInfo1.title,
          url: pageInfo1.url,
        });
        if (ret1) {
          expect(ret1.screenElements).toMatchObject(pageInfo1.screenElements);
        } else {
          expect(ret1).not.toBeUndefined();
        }
        const ret2 = container.find({
          title: pageInfo2.title,
          url: pageInfo2.url,
        });
        if (ret2) {
          expect(ret2.screenElements).toMatchObject(pageInfo2.screenElements);
        } else {
          expect(ret2).not.toBeUndefined();
        }
      });
      it("If you register another screen information with a title different from the registered screen information and the same URL, it will be registered as a new screen in the field.", () => {
        container = new CoverageSourceContainer();
        const pageInfo1 = {
          title: "title06",
          url: "url06",
          screenElements: [
            {
              tagname: "tag07",
              text: "text07",
              xpath: "xpath07",
              attributes: { id: "id07" },
            },
          ],
        };
        const pageInfo2 = {
          title: "title07",
          url: "url06",
          screenElements: [
            {
              tagname: "tag07",
              text: "text07",
              xpath: "xpath07",
              attributes: { id: "id07" },
            },
          ],
        };

        // Test run
        container.register(pageInfo1);
        container.register(pageInfo2);
        // Confirmation of execution result
        const ret1 = container.find({
          title: pageInfo1.title,
          url: pageInfo1.url,
        });
        if (ret1) {
          expect(ret1.screenElements).toMatchObject(pageInfo1.screenElements);
        } else {
          expect(ret1).not.toBeUndefined();
        }
        const ret2 = container.find({
          title: pageInfo2.title,
          url: pageInfo2.url,
        });
        if (ret2) {
          expect(ret2.screenElements).toMatchObject(pageInfo2.screenElements);
        } else {
          expect(ret2).not.toBeUndefined();
        }
      });
    });
    describe("When screen information is registered, delete the non-targeted tags from the screen information before registering.", () => {
      it("normal", () => {
        container = new CoverageSourceContainer();
        const resourceDirPath = path.join("tests", "resources");
        const filePath = path.resolve(resourceDirPath, "latteart.config.json");
        SettingsUtility.loadFile(filePath);

        const pageInfo = {
          title: "title01",
          url: "url01",
          screenElements: [
            {
              tagname: "COL",
              text: "ignore01",
              xpath: "ignore01",
              checked: false,
              attributes: { id: "ignore01" },
            },
            {
              tagname: "tag0l",
              text: "tag0l",
              xpath: "tag0l",
              checked: false,
              attributes: { id: "tag0l", class: "tag0l" },
            },
            {
              tagname: "col",
              text: "ignore02",
              xpath: "ignore02",
              checked: false,
              attributes: { id: "ignore02", class: "ignore02" },
            },
          ],
        };

        // Test run
        container.register(pageInfo);
        // Confirmation of execution result
        const ret = container.find({
          title: pageInfo.title,
          url: pageInfo.url,
        });
        if (ret) {
          expect(ret.screenElements).toMatchObject([
            pageInfo.screenElements[1],
          ]);
        } else {
          expect(ret).not.toBeUndefined();
        }
      });
    });
  });
  describe("Get the screen information registered in itself by using the object that holds the screen title and screen url as a key.", () => {
    it("If there is related screen information, the related screen information (coverage source) is returned.", () => {
      // This test case is omitted because it has been confirmed in the test case
      // "When register is called, the screen information passed as an argument is registered in its own field.".
    });
    it("If there is no corresponding screen information, undefined is returned.", () => {
      container = new CoverageSourceContainer();
      const pageInfo = {
        title: "title01",
        url: "url01",
        screenElements: [
          {
            tagname: "tag01",
            text: "text01",
            xpath: "xpath01",
            checked: false,
            attributes: { id: "id01" },
          },
          {
            tagname: "tag02",
            text: "text02",
            xpath: "xpath02",
            checked: true,
            attributes: { id: "id02", class: "class02" },
          },
        ],
      };

      // Test run
      container.register(pageInfo);
      // Confirmation of execution result
      const ret = container.find({ title: "hoge01", url: "fuga01" });
      expect(ret).toBeUndefined();
    });
  });
});
