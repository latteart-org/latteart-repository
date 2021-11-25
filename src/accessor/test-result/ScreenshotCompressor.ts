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
import LoggingService from "../../logger/LoggingService";
import { executeExternalCommand } from "./util";

export interface ScreenshotCompressor {
  /**
   * Compress the image file and return the file name of the compressed file.
   * @param imageFilePath  Image file path to be compressed
   * @returns Compressed file name
   */
  compress(imageFilePath: string): Promise<string>;

  /**
   * Get the compressed file name.
   * @param filePath
   */
  compressScreenshotFileName(imageFilePath: string): string;
}

/**
 * A class that compresses image files on the command line
 */
export class CommandLineScreenshotCompressor implements ScreenshotCompressor {
  /**
   * Compress the image file from the command line and return the compressed filename.
   * @param filePath  The path of the image file to be compressed
   * @param compressionCommand  Compression command
   * @returns Compressed image file path
   */
  private static async compressScreenshot(
    filePath: string,
    compressionCommand: string
  ) {
    const dirPath = path.dirname(filePath);
    const baseName = `${path.basename(filePath, ".png")}_compressed`;
    const command = compressionCommand
      .replace("{filePath}", filePath)
      .replace("{baseName}", `_${baseName}`)
      .replace("{dirPath}", dirPath);

    LoggingService.debug(`command: ${command}`);
    await executeExternalCommand(command);

    fs.moveSync(`${dirPath}/_${baseName}.webp`, `${dirPath}/${baseName}.webp`);

    const compressedFileName = fs.readdirSync(dirPath).find((fileName) => {
      return path.basename(fileName, path.extname(fileName)) === baseName;
    })!;

    LoggingService.debug(`compressedFileName: ${compressedFileName}`);
    return compressedFileName;
  }

  /**
   * Delete image.
   * @param filePath  Image file path to delete
   */
  private static deleteScreenshot(filePath: string) {
    fs.removeSync(filePath);
    LoggingService.debug("remove succeeded");
  }

  private compressionCommand: string;
  private shouldDeleteOriginalFile: boolean;

  /**
   * constructor
   * @param compressionCommand  Compressed file command
   * @param shouldDeleteOriginalFile  Delete the compressed source file
   */
  constructor(compressionCommand: string, shouldDeleteOriginalFile: boolean) {
    this.compressionCommand = compressionCommand;
    this.shouldDeleteOriginalFile = shouldDeleteOriginalFile;
  }

  /**
   * Image compression.
   * @param imageFilePath  The path of the image file to be compressed
   */
  public async compress(imageFilePath: string): Promise<string> {
    const compressedImageFileName = await CommandLineScreenshotCompressor.compressScreenshot(
      imageFilePath,
      this.compressionCommand
    );

    if (this.shouldDeleteOriginalFile) {
      CommandLineScreenshotCompressor.deleteScreenshot(imageFilePath);
    }

    return compressedImageFileName;
  }

  /**
   * Get the compressed file name.
   * @param filePath
   */
  public compressScreenshotFileName(filePath: string): string {
    return `${path.basename(filePath, ".png")}_compressed.webp`;
  }
}
