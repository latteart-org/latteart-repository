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

import { ElementInfo } from "./types";

export interface CapturedOperation {
  input: string;
  type: string;
  elementInfo: ElementInfo | null;
  title: string;
  url: string;
  screenDef: string;
  imageData: string;
  windowHandle: string;
  screenElements: ElementInfo[];
  inputElements: ElementInfo[];
  keywordTexts?: string[];
}

/**
 * Class that holds operation information.
 */
export class CapturedOperationImpl implements CapturedOperation {
  public input: string;
  public type: string;
  public elementInfo: ElementInfo | null;
  public title: string;
  public url: string;
  public screenDef: string;
  public imageData: string;
  public windowHandle: string;
  public screenElements: ElementInfo[];
  public inputElements: ElementInfo[];
  public keywordTexts?: string[];

  /**
   * constructor
   * @param args.type  Type of operation
   * @param args.windowHandle  The window handle ID that performed the operation
   * @param args.title  Title of operation target
   * @param args.url  URL to be operated
   * @param args.screenDef  Screen definition
   * @param args.input  Input value
   * @param args.elementInfo  Tag information of the operation target
   * @param args.imageData  Screenshot
   * @param args.screenElements  Tag information that makes up the screen
   * @param args.inputElements  input elements in the screen that has been operated at first
   * @param args.keywordTexts  Texts displayed on the screen.
   */
  constructor(args: {
    type: string;
    windowHandle: string;
    title: string;
    url: string;
    screenDef: string;
    input?: string;
    elementInfo?: ElementInfo | null;
    imageData?: string;
    screenElements?: ElementInfo[];
    inputElements?: ElementInfo[];
    keywordTexts?: string[];
  }) {
    this.type = args.type === undefined ? "" : String(args.type);
    this.windowHandle =
      args.windowHandle === undefined ? "" : String(args.windowHandle);
    this.title = args.title === undefined ? "" : String(args.title);
    this.url = args.url === undefined ? "" : String(args.url);
    this.screenDef = args.screenDef === undefined ? "" : String(args.screenDef);
    this.input = args.input === undefined ? "" : String(args.input);
    this.elementInfo = args.elementInfo === undefined ? null : args.elementInfo;
    this.imageData = args.imageData === undefined ? "" : String(args.imageData);
    this.screenElements =
      args.screenElements === undefined ? [] : args.screenElements;
    this.inputElements = args.inputElements ?? [];
    this.keywordTexts = args.keywordTexts;
  }
}
