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

import moment from "moment";
import { ElementInfo } from "./types";

/**
 * Class that handles operation information.
 */
export class Operation {
  /**
   * Create and return an instance
   * @param args.sequence  Sequence number
   * @param args.input  Input value
   * @param args.type  Type of operation
   * @param args.elementInfo  Tag information of the operation target
   * @param args.title  Title of operation target
   * @param args.url  URL to be operated
   * @param args.imageFileUrl  Screenshot URL
   * @param args.windowHandle  The window handle ID that performed the operation
   * @param args.timestamp  Time of operation
   * @param args.inputElements  Input informations
   * @param args.keywordTexts  Texts displayed on the screen
   * @returns Operation class instance
   */
  public static createOperation(args: {
    sequence?: number;
    input?: string;
    type?: string;
    elementInfo?: ElementInfo | null;
    title?: string;
    url?: string;
    imageFileUrl?: string;
    windowHandle?: string;
    timestamp?: string;
    inputElements?: ElementInfo[];
    keywordTexts?: string[];
  }): Operation {
    const operation = new Operation(
      args.sequence ?? 1,
      args.input ?? "",
      args.type ?? "",
      args.elementInfo ?? null,
      args.title ?? "",
      args.url ?? "",
      args.imageFileUrl ?? "",
      args.inputElements ?? [],
      args.windowHandle,
      args.keywordTexts
    );

    if (args.timestamp !== undefined) {
      operation.timestamp = args.timestamp;
    }

    return operation;
  }

  /**
   * Create a new operation instance from an existing operation instance.
   * @param args.other  Existing operational information
   * @param args.sequence  Sequence number
   * @param args.input  Input value
   * @param args.type  Type of operation
   * @param args.elementInfo  Tag information of the operation target
   * @param args.title  Title of operation target
   * @param args.url  URL to be operated
   * @param args.imageFileUrl  Screenshot URL
   * @param args.windowHandle  The window handle ID that performed the operation
   * @param args.timestamp  Time of operation
   * @param args.inputElementInfo  Input informations
   * @param args.keywordTexts  Texts displayed on the screen
   * @returns Operation instance created
   */
  public static createFromOtherOperation(args: {
    other: Operation;
    overrideParams?: {
      sequence?: number;
      input?: string;
      type?: string;
      elementInfo?: ElementInfo | null;
      title?: string;
      url?: string;
      imageFileUrl?: string;
      windowHandle?: string;
      timestamp?: string;
      inputElements?: ElementInfo[];
      keywordTexts?: string[];
    };
  }): Operation {
    if (args.overrideParams === undefined) {
      const newOperation = new Operation(
        args.other.sequence,
        args.other.input,
        args.other.type,
        args.other.elementInfo,
        args.other.title,
        args.other.url,
        args.other.imageFileUrl,
        args.other.inputElements,
        args.other.windowHandle,
        args.other.keywordTexts
      );
      newOperation.timestamp = args.other.timestamp;
      return newOperation;
    }

    const newOperation2 = new Operation(
      args.overrideParams.sequence !== undefined
        ? args.overrideParams.sequence
        : args.other.sequence,
      args.overrideParams.input !== undefined
        ? args.overrideParams.input
        : args.other.input,
      args.overrideParams.type !== undefined
        ? args.overrideParams.type
        : args.other.type,
      args.overrideParams.elementInfo !== undefined
        ? args.overrideParams.elementInfo
        : args.other.elementInfo,
      args.overrideParams.title !== undefined
        ? args.overrideParams.title
        : args.other.title,
      args.overrideParams.url !== undefined
        ? args.overrideParams.url
        : args.other.url,
      args.overrideParams.imageFileUrl !== undefined
        ? args.overrideParams.imageFileUrl
        : args.other.imageFileUrl,
      args.overrideParams.inputElements !== undefined
        ? args.overrideParams.inputElements
        : args.other.inputElements,
      args.overrideParams.windowHandle !== undefined
        ? args.overrideParams.windowHandle
        : args.other.windowHandle,
      args.overrideParams.keywordTexts !== undefined
        ? args.overrideParams.keywordTexts
        : args.other.keywordTexts
    );
    newOperation2.timestamp =
      args.overrideParams.timestamp !== undefined
        ? args.overrideParams.timestamp
        : args.other.timestamp;
    return newOperation2;
  }

  public sequence: number;
  public input: string;
  public type: string;
  public elementInfo: ElementInfo | null;
  public title: string;
  public url: string;
  public imageFileUrl: string;
  public timestamp: string;
  public inputElements: ElementInfo[];
  public windowHandle: string;
  public keywordTexts?: string[];

  /**
   * constructor
   * @param sequence  Sequence number
   * @param input  Input value
   * @param type  Type of operation
   * @param elementInfo  Tag information of the operation target
   * @param title  Title of operation target
   * @param url  URL to be operated
   * @param imageFileUrl  Screenshot URL
   * @param windowHandle  The window handle ID that performed the operation
   * @param inputElements  Input informations
   * @param keywordTexts  Texts displayed on the screen.
   */
  constructor(
    sequence: number,
    input: string,
    type: string,
    elementInfo: ElementInfo | null,
    title: string,
    url: string,
    imageFileUrl: string,
    inputElements: ElementInfo[],
    windowHandle?: string,
    keywordTexts?: string[]
  ) {
    this.sequence = sequence;
    this.input = input;
    this.type = type;
    this.elementInfo = elementInfo;
    this.title = title;
    this.url = url;
    this.imageFileUrl = imageFileUrl;
    this.timestamp = moment().unix().toString();
    this.inputElements = inputElements === undefined ? [] : inputElements;
    this.windowHandle = windowHandle === undefined ? "" : windowHandle;
    this.keywordTexts = keywordTexts;
  }
}
