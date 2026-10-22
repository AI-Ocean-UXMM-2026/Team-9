const dateParts = (instant: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

export function dateTimeInputInTimeZone(instant: string, timeZone: string) {
  const parts = dateParts(new Date(instant), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function dateInTimeZone(instant: string, timeZone: string) {
  const parts = dateParts(new Date(instant), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function dateTimeInputToInstant(value: string, timeZone: string) {
  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = targetUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = dateParts(new Date(guess), timeZone);
    const representedUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute),
    );
    guess += targetUtc - representedUtc;
  }
  const result = new Date(guess).toISOString();
  if (dateTimeInputInTimeZone(result, timeZone) !== value)
    throw new Error('This local time does not exist in the selected time zone.');
  return result;
}
