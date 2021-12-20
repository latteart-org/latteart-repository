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

import {
  GetConfigResponse,
  PutConfigDto,
  PutConfigResponse,
} from "../interfaces/Configs";
import { getRepository } from "typeorm";
import { ConfigEntity } from "../entities/ConfigEntity";
import { SettingsUtility } from "../lib/settings/SettingsUtility";
import {
  GetDeviceConfigResponse,
  PutDeviceConfigDto,
  PutDeviceConfigResponse,
} from "@/interfaces/DeviceConfigs";

export class ConfigsService {
  public async getConfig(projectId: string): Promise<GetConfigResponse> {
    const configEntity = await this.getConfigSource(projectId);
    return JSON.parse(configEntity.text);
  }

  public async getDeviceConfig(
    projectId: string
  ): Promise<GetDeviceConfigResponse> {
    const configEntity = await this.getConfigSource(projectId);
    return JSON.parse(configEntity.deviceText);
  }

  public async updateConfig(
    projectId: string,
    requestBody: PutConfigDto
  ): Promise<PutConfigResponse> {
    const configEntity = await this.getConfigSource(projectId);
    configEntity.text = JSON.stringify(requestBody);

    const savedConfig = await getRepository(ConfigEntity).save(configEntity);

    return (JSON.parse(savedConfig.text) as unknown) as PutConfigResponse;
  }

  public async updateDeviceConfig(
    projectId: string,
    requestBody: PutDeviceConfigDto
  ): Promise<PutDeviceConfigResponse> {
    const configEntity = await this.getConfigSource(projectId);
    configEntity.deviceText = JSON.stringify(requestBody);

    const savedConfig = await getRepository(ConfigEntity).save(configEntity);

    return (JSON.parse(
      savedConfig.deviceText
    ) as unknown) as PutDeviceConfigResponse;
  }

  private async getConfigSource(projectId: string): Promise<ConfigEntity> {
    const configRepository = getRepository(ConfigEntity);
    let config = await configRepository.find();
    if (!config[0]) {
      const settings = SettingsUtility.settingsProvider.settings;
      console.log(settings);
      const deviceSettings = SettingsUtility.deviceSettingsProvider.settings;
      console.log(deviceSettings);

      const newConfig = new ConfigEntity();
      newConfig.projectId = projectId;
      newConfig.text = JSON.stringify(settings);
      newConfig.deviceText = JSON.stringify(deviceSettings);
      newConfig.repositoryUrl = "http://127.0.0.1:3000/";
      try {
        await configRepository.save(newConfig);
      } catch (error) {
        console.error(error);
      }
      config = await configRepository.find();
      if (!config[0]) {
        throw new Error();
      }
    }
    return config[0];
  }
}
