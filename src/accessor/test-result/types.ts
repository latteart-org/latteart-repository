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

import { Operation } from "./Operation";
import { Note } from "./Note";

/**
 * Operation information and Notes.
 */
export interface OperationWithNotes {
  operation: Operation;
  intention: Note | null;
  bugs: Note[] | null;
  notices: Note[] | null;
}

/**
 * Tag information.
 */
export interface ElementInfo {
  tagname: string;
  text?: string;
  xpath: string;
  value?: string;
  checked?: boolean;
  attributes: { [key: string]: any };
}

/**
 * Screen definition.
 */
export interface ScreenDef {
  definition: string;
  alias: string;
}

export type OperationHistory = OperationWithNotes[];

/**
 * Screen information used for coverage.
 */
export interface CoverageSource {
  title: string;
  url: string;
  screenElements: ElementInfo[];
}

/**
 * Input element infomations.
 */
export interface InputElementInfo {
  title: string;
  url: string;
  inputElements: ElementInfo[];
}
