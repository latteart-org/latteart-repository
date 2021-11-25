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

export class SessionData {
  private sessionId = "";
  private sequence = 0;
  private startTimeStamp = 0;
  private endTimeStamp = -1;

  /**
   * constructor
   * @param sessionId  Session ID
   * @param sequence  Currently assigned sequence number
   * @param startTimeStamp  Time to start capture
   * @param endTimeStamp  Time at the end of capture
   */
  constructor(
    sessionId?: any,
    sequence?: any,
    startTimeStamp?: any,
    endTimeStamp?: any
  ) {
    if (sessionId) {
      this.sessionId = sessionId;
      this.sequence = sequence;
      this.startTimeStamp = startTimeStamp;
      this.endTimeStamp = endTimeStamp;
    } else {
      this.sessionId = `session_${moment().format("YYYYMMDD_HHmmss")}`;
      this.sequence = 0;
      this.startTimeStamp = 0;
      this.endTimeStamp = -1;
    }
  }

  /**
   * Get session id.
   * @returns Session id
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get sequence number.
   * @returns Sequence number.
   */
  public getSequence(): number {
    return this.sequence;
  }

  /**
   * Increment the sequence number.
   */
  public incrementSequence(): void {
    this.sequence = this.sequence + 1;
  }

  /**
   * Set the session start time.
   * @param unixTimeStamp
   */
  public setStartTimeStamp(unixTimeStamp: number): void {
    this.startTimeStamp = unixTimeStamp;
  }

  /**
   * Get the session start time.
   * @returns Session start time
   */
  public getStartTimeStamp(): number {
    return this.startTimeStamp;
  }

  /**
   * Set session end time.
   * @param unixTimeStamp
   */
  public setEndTimeStamp(unixTimeStamp: number): void {
    this.endTimeStamp = unixTimeStamp;
  }

  /**
   * Get session end time.
   * @returns Session end time
   */
  public getEndTimeStamp(): number {
    return this.endTimeStamp;
  }

  /**
   * Determine if the session is over.
   * @returns Returns True if session ends
   */
  public isCompletedEnd(): boolean {
    if (this.endTimeStamp <= 0) {
      return false;
    }
    return true;
  }

  /**
   * Start a session
   * @param endOperationTimeStamp  Session end time
   */
  public startSession(endOperationTimeStamp?: number): number {
    // If it did not end normally last time, or when creating a new one
    if (this.endTimeStamp <= 0) {
      if (!endOperationTimeStamp) {
        this.startTimeStamp = moment().unix();
        return this.startTimeStamp;
      }
      this.endTimeStamp = endOperationTimeStamp;
    }
    const timeDifference = this.endTimeStamp - this.startTimeStamp;
    this.startTimeStamp = moment().unix() - timeDifference;
    this.endTimeStamp = -1;

    return this.startTimeStamp;
  }

  /**
   * End session.
   */
  public endSession(): void {
    this.endTimeStamp = moment().unix();
  }
}
