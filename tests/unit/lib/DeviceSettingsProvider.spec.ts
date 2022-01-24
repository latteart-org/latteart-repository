import { DeviceSettingsProvider } from "@/lib/settings/DeviceSettingsProvider";
import path from "path";
import { Browser, PlatformName } from "@/lib/settings/SettingsEnum";
import { ERR_MSG } from "@/lib/settings/Constants";

describe("DeviceSettingsProvider", () => {
  let deviceSettingsProvider: DeviceSettingsProvider;
  const resourceDirPath = path.join("tests", "resources");

  beforeEach(() => {
    deviceSettingsProvider = new DeviceSettingsProvider();

    expect(deviceSettingsProvider.settings).toEqual({
      config: {
        platformName: PlatformName.PC,
        browser: Browser.Chrome,
        device: {
          deviceName: "",
          modelNumber: "",
          osVersion: "",
        },
        platformVersion: "",
        waitTimeForStartupReload: 0,
        executablePaths: {
          browser: "",
          driver: "",
        },
      },
    });
  });

  describe("When the loadFile method is called, it reads the specified configuration file and assigns its contents to the settings field.", () => {
    it("normal", () => {
      const filePath = path.resolve(
        resourceDirPath,
        "latteart.device.config.json"
      );

      deviceSettingsProvider.loadFile(filePath);

      expect(deviceSettingsProvider.settings).toEqual({
        config: {
          browser: Browser.Chrome,
          device: {
            deviceName: "",
            modelNumber: "",
            osVersion: "",
          },
          platformName: PlatformName.PC,
          platformVersion: "",
          waitTimeForStartupReload: 0,
          executablePaths: {
            browser: "",
            driver: "",
          },
        },
      });
    });

    it("Unallowed strings are set", () => {
      const filePath = path.resolve(
        resourceDirPath,
        "latteart.device.config.validate.json"
      );

      let message = "";
      try {
        deviceSettingsProvider.loadFile(filePath);
      } catch (error) {
        message = error.message;
      }

      expect(message).toEqual(
        `${ERR_MSG.SETTINGS.INVALID_PLATFORMNAME} Solaris`
      );
    });

    it("If the file does not exist, the default value will be set", () => {
      const filePath = path.resolve(resourceDirPath, "hogehoge.json");

      deviceSettingsProvider.loadFile(filePath);

      expect(deviceSettingsProvider.settings).toEqual({
        config: {
          browser: Browser.Chrome,
          device: {
            deviceName: "",
            modelNumber: "",
            osVersion: "",
          },
          platformName: PlatformName.PC,
          platformVersion: "",
          waitTimeForStartupReload: 0,
          executablePaths: {
            browser: "",
            driver: "",
          },
        },
      });
    });
  });

  describe("When the getSedtting method is called, the setting value corresponding to the specified key character string is acquired from the possessed setting information and returned.", () => {
    it("If a key string concatenated by a period is specified, the child hierarchy is searched.", () => {
      expect(deviceSettingsProvider.getSetting("config.browser")).toEqual(
        "Chrome"
      );
    });

    it("If the corresponding setting is not found, undefined is returned.", () => {
      expect(deviceSettingsProvider.getSetting("hoge")).toBeUndefined();

      expect(
        deviceSettingsProvider.getSetting("config.browser.hoge")
      ).toBeUndefined();
    });
  });
  describe("Validation detects invalid settings", () => {
    it("normal", () => {
      // errorをthrowしない
      (deviceSettingsProvider as any).validate(deviceSettingsProvider.settings);
    });
    it("Incorrect browser value", () => {
      const browser = "Vivaldi" as Browser;
      deviceSettingsProvider.settings.config.browser = browser;
      try {
        (deviceSettingsProvider as any).validate(
          deviceSettingsProvider.settings
        );
      } catch (error) {
        expect(error.message).toEqual(
          `${ERR_MSG.SETTINGS.INVALID_BROWSER} ${browser}`
        );
      }
    });
    it("Incorrect platform value", () => {
      const platformName = "Solaris" as PlatformName;
      deviceSettingsProvider.settings.config.platformName = platformName;
      try {
        (deviceSettingsProvider as any).validate(
          deviceSettingsProvider.settings
        );
      } catch (error) {
        expect(error.message).toEqual(
          `${ERR_MSG.SETTINGS.INVALID_PLATFORMNAME} ${platformName}`
        );
      }
    });
  });
});
