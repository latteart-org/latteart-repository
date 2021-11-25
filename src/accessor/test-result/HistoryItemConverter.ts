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
import { OperationHistoryItem } from "./OperationHistoryItem";

interface OperationHistoryItemWithNoteSequence {
  id: string;
  type: "bug" | "notice" | "intention";
  value: string;
  details: string;
  tags: string[];
  imageFileUrl: string;
  timestamp: string;
  sequence: number;
}

/**
 * Class to convert operation history.
 */
export default class HistoryItemConverter {
  /**
   * Add sequence information to Note and return operation history.
   * @param beforeItems  Operation history
   * @returns Operation history with sequence information added to Note
   */
  public convertToItemsWithNoteSequence(
    beforeItems: OperationHistoryItem[]
  ): {
    operation: Operation | null;
    bugs: OperationHistoryItemWithNoteSequence[];
    notices: OperationHistoryItemWithNoteSequence[];
    intention: OperationHistoryItemWithNoteSequence | null;
  }[] {
    return beforeItems.map((item, index) => {
      return {
        operation: item.operation,
        bugs:
          item.bugs?.map((note) => {
            return {
              id: note.id,
              type: note.type,
              value: note.value,
              details: note.details,
              tags: note.tags,
              imageFileUrl: note.imageFileUrl,
              timestamp: note.timestamp,
              sequence: index + 1,
            };
          }) ?? [],
        notices:
          item.notices?.map((note) => {
            return {
              id: note.id,
              type: note.type,
              value: note.value,
              details: note.details,
              tags: note.tags,
              imageFileUrl: note.imageFileUrl,
              timestamp: note.timestamp,
              sequence: index + 1,
            };
          }) ?? [],
        intention: item.intention
          ? {
              id: item.intention.id,
              type: item.intention.type,
              value: item.intention.value,
              details: item.intention.details,
              tags: item.intention.tags,
              imageFileUrl: item.intention.imageFileUrl,
              timestamp: item.intention.timestamp,
              sequence: index + 1,
            }
          : null,
      };
    });
  }
}
