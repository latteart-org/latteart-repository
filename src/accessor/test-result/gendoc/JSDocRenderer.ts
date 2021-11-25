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
import glob from "glob";
import LoggingService from "../../../logger/LoggingService";
const jsdoc = require("jsdoc-api"); // eslint-disable-line

export class JSDocRenderer {
  public async render(
    inputDirPath: string,
    testResultDirPaths: string[],
    testResultBaseDirPath: string
  ): Promise<void> {
    const assetsBaseDirPath = path.join(inputDirPath, "assets");

    for (const testResultDirPath of testResultDirPaths) {
      const relativePath = path.relative(
        testResultBaseDirPath,
        testResultDirPath
      );
      const assetsDirPath = path.join(assetsBaseDirPath, relativePath);
      await fs.mkdirp(assetsDirPath);

      const filepaths = await new Promise<string[]>((resolve, reject) => {
        glob(`${testResultDirPath}/**/*.*`, (error, files) => {
          if (error) {
            reject(error);
          }

          resolve(
            files.filter((file) => {
              return [".webp", ".png"].includes(path.extname(file));
            })
          );
        });
      });

      LoggingService.info("Start copying image files for JSDoc rendering.");

      for (const filepath of filepaths) {
        const destPath = path.join(assetsDirPath, path.basename(filepath));

        LoggingService.info(`  ${filepath} -> ${destPath}`);

        await fs.copyFile(filepath, destPath);
      }

      LoggingService.info("Finish copying image files for JSDoc rendering.");
    }

    const confFilePath = path.join(inputDirPath, "conf.json");

    await fs.outputJSON(confFilePath, {
      plugins: ["jsdoc-mermaid"],
      templates: {
        default: {
          staticFiles: {
            include: [assetsBaseDirPath],
          },
        },
      },
    });

    const readmeFilePath = path.join(inputDirPath, "readme.md");

    const outputDirPath = path.join(inputDirPath, "doc");

    await new Promise<void>((resolve) => {
      jsdoc.renderSync({
        files: [inputDirPath],
        recurse: true,
        configure: confFilePath,
        destination: outputDirPath,
        readme: readmeFilePath,
      });

      resolve();
    });

    await fs.remove(assetsBaseDirPath);
    await fs.remove(confFilePath);
    await fs.remove(readmeFilePath);
  }
}
