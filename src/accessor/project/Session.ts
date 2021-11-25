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

/**
 * Session information.
 */
export default interface Session {
  name: string;
  id?: string;
  isDone: boolean;
  doneDate: string;
  testItem: string;
  testerName: string;
  memo: string;
  attachedFiles?: Array<{ name: string; fileUrl: string; fileData?: string }>;
  testResultFiles?: Array<{ name: string; id: string }>;
  issues: Array<{
    type: string;
    value: string;
    details: string;
    status: string;
    ticketId: string;
    source: { type: string; sequence: number; index: number };
  }>;
  testingTime?: number;
}
