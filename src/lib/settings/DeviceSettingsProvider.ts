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

import fs from "fs";
import { ERR_MSG } from "./Constants";
import { Browser, PlatformName } from "./SettingsEnum";
import DeviceSettings from "./DeviceSettings";
import * as Util from "./util";
import validate from "./DeviceSettings.validator";

/**
 * Class that handles setting values.
 */
export class DeviceSettingsProvider {
  public settings: DeviceSettings = new DeviceSettings();

  /**
   * Read the configuration file.
   * If reading fails, throw Error.
   * @param filePath  Configuration file path
   */
  public loadFile(filePath: string): void {
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile) {
        return;
      }
    } catch (error) {
      return;
    }
    const readdata = JSON.parse(fs.readFileSync(filePath, "utf8"));
    this.merge(this.settings, readdata);
    this.validate(this.settings);
    validate(readdata);
  }

  /**
   * Save the configuration file.
   * If saving fails, throw Error.
   * @param saveData  Saved data
   */
  public saveFile(filePath: string): void {
    fs.writeFileSync(filePath, JSON.stringify(this.settings, null, 2), "utf-8");
  }

  /**
   * Gets the setting value corresponding to the key string.
   * If there is no corresponding setting, undefined is returned.
   * @param keyPath  Key strings concatenated by periods
   * @returns Set value
   */
  public getSetting(keyPath: string): any {
    if (keyPath === "") {
      return this.settings;
    }

    const keys = keyPath.split(".");
    return Util.findValueRecursively(keys, this.settings);
  }

  /**
   * Set a new value for the setting value corresponding to the key string.
   * @param keyPath  Key strings concatenated by periods
   * @param value New settings
   */
  public setSetting(keyPath: string, value: any): void {
    if (keyPath === "") {
      this.settings = value;
      return;
    }

    const keys = keyPath.split(".");
    const parentKeys = keys.slice(0, keys.length - 1);
    const parent = this.getSetting(parentKeys.join("."));

    if (parent === undefined) {
      return;
    }

    parent[keys[keys.length - 1]] = value;
  }

  /**
   * Validate the read file.
   * @param data  Read file data
   */
  private validate(data: DeviceSettings) {
    const platformName = data.config.platformName;
    if (!Util.isIncludeEnum(platformName, PlatformName)) {
      throw new Error(
        `${ERR_MSG.SETTINGS.INVALID_PLATFORMNAME} ${platformName}`
      );
    }

    const browser = data.config.browser;
    if (!Util.isIncludeEnum(browser, Browser)) {
      throw new Error(`${ERR_MSG.SETTINGS.INVALID_BROWSER} ${browser}`);
    }
  }

  /**
   * If a configuration file is set, the configuration parameters will be merged into the setting.
   * @param target  Objects to merge
   * @param source  Merge source object
   */
  private merge(target: DeviceSettings, source: DeviceSettings) {
    if (!source.config) {
      return;
    }

    const sourceConfig = source.config;

    if (
      sourceConfig.platformName &&
      (sourceConfig.platformName as string) !== ""
    ) {
      target.config.platformName = sourceConfig.platformName;
    }

    if (sourceConfig.browser && (sourceConfig.browser as string) !== "") {
      target.config.browser = sourceConfig.browser;
    }

    if (sourceConfig.platformVersion && sourceConfig.platformVersion !== "") {
      target.config.platformVersion = sourceConfig.platformVersion;
    }

    if (sourceConfig.waitTimeForStartupReload) {
      target.config.waitTimeForStartupReload =
        sourceConfig.waitTimeForStartupReload;
    }

    if (sourceConfig.executablePaths) {
      target.config.executablePaths = sourceConfig.executablePaths;
    }

    if (!source.config.device) {
      return;
    }

    const sourceDevice = source.config.device;

    if (sourceDevice.deviceName && sourceDevice.deviceName !== "") {
      target.config.device.deviceName = sourceDevice.deviceName;
    }

    if (sourceDevice.modelNumber && sourceDevice.modelNumber !== "") {
      target.config.device.modelNumber = sourceDevice.modelNumber;
    }

    if (sourceDevice.osVersion && sourceDevice.osVersion !== "") {
      target.config.device.osVersion = sourceDevice.osVersion;
    }
  }
}
