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

/**
 * Class that handles Note.
 */
export class Note {
  /**
   * Create a new note from an existing note
   * @param args.other  Existing notes
   * @param args.overrideParams.id  Note ID to overwrite
   * @param args.overrideParams.value  Value to overwrite
   * @param args.overrideParams.details  Details to overwrite
   * @param args.overrideParams.imageFileUrl  Image URL to overwrite
   */
  public static createFromOtherNote(args: {
    other: Note;
    overrideParams?: {
      id?: string;
      type?: "bug" | "notice" | "intention";
      value?: string;
      details?: string;
      imageFileUrl?: string;
      tags?: string[];
    };
  }): Note {
    return new Note({
      id: args.overrideParams?.id ?? args.other.id,
      type: args.overrideParams?.type ?? args.other.type,
      value: args.overrideParams?.value ?? args.other.value,
      details: args.overrideParams?.details ?? args.other.details,
      imageFileUrl:
        args.overrideParams?.imageFileUrl ?? args.other.imageFileUrl,
      tags: args.overrideParams?.tags ?? args.other.tags,
    });
  }

  public id: string;
  public type: "bug" | "notice" | "intention";
  public value: string;
  public details: string;
  public imageFileUrl: string;
  public timestamp: string;
  public tags: string[];

  /**
   * constructor
   * @param args.id  Note id
   * @param args.type  Note type
   * @param args.value  Value
   * @param args.details  Details
   * @param args.imageFileUrl  Image URL
   * @param args.timestamp  Creation timestamp
   */
  constructor(args: {
    id: string;
    type: "bug" | "notice" | "intention";
    value?: string;
    details?: string;
    imageFileUrl?: string;
    timestamp?: string;
    tags?: string[];
  }) {
    this.id = args.id;
    this.type = args.type;
    this.value = args.value ?? "";
    this.details = args.details ?? "";
    this.imageFileUrl = args.imageFileUrl ?? "";
    this.timestamp = args.timestamp ?? moment().unix().toString();
    this.tags = args.tags ?? [];
  }
}
