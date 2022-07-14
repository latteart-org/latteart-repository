/**
 * Copyright 2022 NTT Corporation.
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

export function unixtimeToDate(unixtime: number): Date {
  return moment.unix(unixtime).toDate();
}

export function unixtimeToFormattedString(
  unixtime: number,
  format: string
): string {
  return moment.unix(unixtime).format(format);
}

export function dateToFormattedString(date: Date, format: string): string {
  return moment(date).format(format);
}

export function getCurrentUnixtime(): number {
  return moment().unix();
}

export function getCurrentEpochMillis(): number {
  return moment().valueOf();
}
