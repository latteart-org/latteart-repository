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

import { InputElementInfo, ElementInfo } from "./types";

/**
 * Class to store input element infomations.
 */
export default class InputElementInfoContainer {
  private _inputElementInfos: InputElementInfo[];

  /**
   * constructor
   * @param inputElementInfos  input element infomations
   */
  constructor(...inputElementInfos: InputElementInfo[]) {
    this._inputElementInfos = inputElementInfos;
  }

  /**
   * Get input element infomations
   */
  public get inputElementInfos(): InputElementInfo[] {
    return this._inputElementInfos;
  }

  /**
   * Register input element infomations
   * @param args.title  Screen title
   * @param args.url  Screen URL
   * @param args.inputElements  Tag information that makes up the screen
   */
  public register(args: {
    title: string;
    url: string;
    inputElements: ElementInfo[];
  }): void {
    this._inputElementInfos.push({
      title: args.title,
      url: args.url,
      inputElements: args.inputElements,
    });
  }

  /**
   * Find input element infomations
   * @param args.title  Screen title
   * @param args.url  Screen Url
   * @returns input element infomations
   */
  public find(args: { title: string; url: string }): InputElementInfo[] {
    return this._inputElementInfos.filter((pageInfo) => {
      return pageInfo.title === args.title && pageInfo.url === args.url;
    });
  }
}
