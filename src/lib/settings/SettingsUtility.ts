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

import { SettingsProvider } from "./SettingsProvider";
import { DeviceSettingsProvider } from "./DeviceSettingsProvider";

export enum SettingsType {
  device = "device",
}

/**
 * A utility that provides settings.
 */
export class SettingsUtility {
  public static get settingsProvider(): SettingsProvider {
    return this._settingsProvider;
  }

  public static get deviceSettingsProvider(): DeviceSettingsProvider {
    return this._deviceSettingsProvider;
  }

  /**
   * Read the configuration file.
   * @param type  Read the configuration file.
   */
  public static loadFile(filePath: string, type?: SettingsType): void {
    switch (type) {
      case SettingsType.device:
        this._deviceSettingsProvider.loadFile(filePath);
        break;
      default:
        this._settingsProvider.loadFile(filePath);
        break;
    }
  }

  public static saveFile(filePath: string, type?: SettingsType): void {
    switch (type) {
      case SettingsType.device:
        this._deviceSettingsProvider.saveFile(filePath);
        break;
      default:
        this._settingsProvider.saveFile(filePath);
        break;
    }
  }

  /**
   * Get the setting value corresponding to the key character string.
   * If there is no corresponding setting, undefined is returned.
   * @param keyPath  Key strings concatenated by periods
   * @param type  Setting type
   * @returns Set value
   */
  public static getSetting(keyPath: string, type?: SettingsType): any {
    switch (type) {
      case SettingsType.device:
        return this._deviceSettingsProvider.getSetting(keyPath);
      default:
        return this._settingsProvider.getSetting(keyPath);
    }
  }

  /**
   * Set a new value to the setting value corresponding to the key string.
   * @param keyPath  Key strings concatenated by periods
   * @param value  New setting
   * @param type Configuration file type
   */
  public static setSetting(
    keyPath: string,
    value: any,
    type?: SettingsType
  ): any {
    switch (type) {
      case SettingsType.device:
        return this._deviceSettingsProvider.setSetting(keyPath, value);
      default:
        return this._settingsProvider.setSetting(keyPath, value);
    }
  }

  private static _settingsProvider = new SettingsProvider();
  private static _deviceSettingsProvider = new DeviceSettingsProvider();
}
