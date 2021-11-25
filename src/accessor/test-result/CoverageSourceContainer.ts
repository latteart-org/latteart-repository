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

import { CoverageSource, ElementInfo } from "./types";
import { SettingsUtility } from "./SettingsUtility";

/**
 * Class to store screen information.
 */
export default class CoverageSourceContainer {
  private _coverageSources: CoverageSource[];

  /**
   * constructor
   * @param coverageSources  Screen information
   */
  constructor(...coverageSources: CoverageSource[]) {
    this._coverageSources = coverageSources;
  }

  /**
   * Get screen information.
   */
  public get coverageSources(): CoverageSource[] {
    return this._coverageSources;
  }

  /**
   * Register screen information
   * @param args.title  Screen title
   * @param args.url  Screen URL
   * @param args.screenElements  Tag information that makes up the screen
   */
  public register(args: {
    title: string;
    url: string;
    screenElements: ElementInfo[];
  }): void {
    const targetPage = this._coverageSources.find((coverageSource) => {
      return (
        coverageSource.title === args.title && coverageSource.url === args.url
      );
    });

    if (targetPage) {
      const newElements = [
        ...targetPage.screenElements,
        ...this.removeIgnoreTagsFrom(args.screenElements),
      ];
      targetPage.screenElements = newElements.filter((newElement, index) => {
        return (
          newElements.findIndex((elem) => elem.xpath === newElement.xpath) ===
          index
        );
      });
      return;
    }

    this._coverageSources.push({
      title: args.title,
      url: args.url,
      screenElements: this.removeIgnoreTagsFrom(args.screenElements),
    });
  }

  /**
   * Find screen information
   * @param args.title  Screen title
   * @param args.url  Screen Url
   * @returns Screen information
   */
  public find(args: {
    title: string;
    url: string;
  }): CoverageSource | undefined {
    return this._coverageSources.find((pageInfo) => {
      return pageInfo.title === args.title && pageInfo.url === args.url;
    });
  }

  /**
   * Remove non-targeted screen elements specified in the "excluded tags" setting.
   * @param screenElements  Tag information that makes up the screen
   * @returns Screen elements without ones specified in the "excluded tags" setting.
   */
  private removeIgnoreTagsFrom(screenElements: ElementInfo[]): ElementInfo[] {
    const ignoreTags = SettingsUtility.getSetting(
      "captureSettings.ignoreTags"
    ) as string[];

    // Remove non-targeted elements
    return screenElements.filter((elmInfo) => {
      return !(
        ignoreTags.includes(elmInfo.tagname.toUpperCase()) ||
        ignoreTags.includes(elmInfo.tagname.toLowerCase())
      );
    });
  }
}
