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
