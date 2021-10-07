const DaysOfWeek: String[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const getCurrentWeekDateObjects = (
  currentDate: Date = new Date()
): Date[] => {
  const weekDateObjects: Date[] = [];
  const startOfWeek: Date = new Date();
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  weekDateObjects.push(startOfWeek);

  for (let i: number = 1; i < 7; i++) {
    weekDateObjects.push(
      new Date(
        startOfWeek.getFullYear(),
        startOfWeek.getMonth(),
        startOfWeek.getDate() + i
      )
    );
  }

  return weekDateObjects;
};

interface CalendarDayItemInterface {
  dayOfWeek: String;
  date: number;
}

export const formatWeekDateObjectsForCalendar = (
  weekDateObjects: Date[]
): CalendarDayItemInterface[] => {
  const calendarDayItems = [];
  for (const day of weekDateObjects) {
    calendarDayItems.push({
      dayOfWeek: DaysOfWeek[day.getDay()],
      date: day.getDate(),
    });
  }
  return calendarDayItems;
};

export const isCurrentDateBetween = (
  startDate: Date,
  endDate: Date
): boolean => {
  const currentDate: Date = new Date();
  return currentDate >= startDate && currentDate <= endDate;
};

// e.g. 9:30 AM - 10:30 AM
export const getStartEndFormattedTimeString = (
  startDate: Date,
  endDate: Date
): String =>
  `${getFormattedTimeString(startDate)} - ${getFormattedTimeString(endDate)}`;

// e.g 10:30 AM
const getFormattedTimeString = (date: Date): string => {
  let hour: number = date.getHours();
  hour = hour > 12 ? hour - 12 : hour;

  const minute: number = date.getMinutes();
  const timePeriod: string = date.toLocaleTimeString().split(' ')[1];

  return `${hour}:${minute < 10 ? `0${minute}` : minute} ${timePeriod}`;
};