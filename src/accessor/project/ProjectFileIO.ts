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

import path from "path";
import fs from "fs-extra";
import Project, { ProjectImpl, IdGenerator } from "./Project";

/**
 * Class to read and write project information.
 */
export default class ProjectFileIO {
  private filePath: string;

  /**
   * constructor
   * @param outputDirPath  Path to output project information
   */
  constructor(outputDirPath: string) {
    this.filePath = path.join(outputDirPath, "project.json");
  }

  /**
   * Load project information.
   * @returns Project information
   */
  public async read(): Promise<Project> {
    const data = await fs.readJSON(this.filePath, { encoding: "utf8" });

    const idGenerator = new IdGenerator(data.idGenerator.sequences);

    const project = new ProjectImpl(data.id, data.name, idGenerator);
    project.addTestMatrices(...data.testMatrices);
    project.addStories(...(data.stories ?? []));
    project.addProgressDatas(...data.progressDatas);

    return project;
  }

  /**
   * Writing project information.
   * @param project  Project information
   */
  public async write(project: Project): Promise<void> {
    const data = {
      id: project.id,
      name: project.name,
      stories: project.stories,
      progressDatas: project.progressDatas,
      testMatrices: project.testMatrices,
      idGenerator: {
        sequences: project.idGenerator.sequences,
      },
    };

    return fs.outputJSON(this.filePath, data, { encoding: "utf8" });
  }
}
