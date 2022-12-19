/**
 * Copyright 2022 NTT Corporation.
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

/**
 * Device config data for update.
 */
export type PutDeviceConfigDto = DeviceConfigs;

/**
 * Updated device config data.
 */
export type PutDeviceConfigResponse = DeviceConfigs;

/**
 * Device config data for the specified ID.
 */
export type GetDeviceConfigResponse = DeviceConfigs;

/**
 * Device config.
 */
export interface DeviceConfigs {
  platformName: "PC" | "Android" | "iOS" | "";
  browser: "Chrome" | "Safari" | "Edge" | "";
  device: {
    deviceName: string;
    modelNumber: string;
    osVersion: string;
  };
  platformVersion: string;
  waitTimeForStartupReload: number;
  executablePaths?: {
    browser: string;
    driver: string;
  };
}
