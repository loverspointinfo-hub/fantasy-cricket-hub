import { format, isToday, isTomorrow } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const IST_TZ = "Asia/Kolkata";

/** Convert a local datetime-local string (treated as IST) to a UTC ISO string for DB storage */
export const istToUTC = (localDatetimeStr: string): string => {
  return fromZonedTime(new Date(localDatetimeStr), IST_TZ).toISOString();
};

/** Convert a UTC date string to a datetime-local compatible string in IST (YYYY-MM-DDTHH:mm) */
export const utcToISTInput = (utcStr: string): string => {
  const istDate = toZonedTime(new Date(utcStr), IST_TZ);
  return format(istDate, "yyyy-MM-dd'T'HH:mm");
};

/** Convert a date string/Date to IST zoned time */
export const toIST = (date: string | Date): Date => {
  return toZonedTime(new Date(date), IST_TZ);
};

/** Format a date in IST with the given format string */
export const formatIST = (date: string | Date, fmt: string): string => {
  return format(toIST(date), fmt);
};

/** "Today, 7:30 PM" / "Tomorrow, 3:00 PM" / "15 Mar, 7:30 PM" in IST */
export const formatMatchTime = (dateStr: string): string => {
  const d = toIST(dateStr);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "dd MMM, h:mm a");
};
