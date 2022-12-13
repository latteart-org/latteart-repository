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

import { ScreenDefinitionConfig } from "../lib/ScreenDefFactory";
import {
  AutofillSetting,
  AutoOperationSetting,
  Coverage,
} from "../lib/settings/Settings";

export type PutConfigDto = ExportableConfig;

export type PutConfigResponse = ExportableConfig;

export type GetConfigResponse = ExportableConfig;

export type ExportableConfig = ProjectConfig;

export type SnapshotConfig = { locale: string };

export type BackendConfig = Omit<ProjectConfig, "config"> & ServerConfig;

type ServerConfig = {
  config: {
    autofillSetting: AutofillSetting;
    autoOperationSetting: AutoOperationSetting;
    screenDefinition: ScreenDefinitionConfig;
    coverage: Coverage;
    imageCompression: {
      isEnabled: boolean;
      isDeleteSrcImage: boolean;
      command: string;
    };
  };
  captureSettings: {
    ignoreTags: string[];
  };
};

export interface ProjectConfig {
  viewPointsPreset: Array<{
    id: string;
    name: string;
    viewPoints: Array<{ name: string; description: string }>;
  }>;
  defaultTagList: string[];
  config: {
    autofillSetting: AutofillSetting;
    autoOperationSetting: AutoOperationSetting;
    screenDefinition: ScreenDefinitionConfig;
    coverage: Coverage;
    imageCompression: {
      isEnabled: boolean;
      isDeleteSrcImage: boolean;
    };
  };
}
