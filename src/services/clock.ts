import { BUSINESS_TIME_ZONE } from '../domain/types';

export interface Clock {
  now(): Date;
  today(): string;
}

export function clockForTimeZone(timeZone: string): Clock {
  return {
    now: () => new Date(),
    today: () => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());
      const part = (type: string) =>
        parts.find((item) => item.type === type)?.value;
      return `${part('year')}-${part('month')}-${part('day')}`;
    },
  };
}

export const systemClock: Clock = {
  now: () => new Date(),
  today: () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  },
};

export function fixedClock(instant: string): Clock {
  const fixedInstant = new Date(instant);
  if (Number.isNaN(fixedInstant.getTime()))
    throw new Error('Fixed clock requires a valid date-time instant.');
  return {
    now: () => new Date(fixedInstant),
    today: () => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(fixedInstant);
      const part = (type: string) =>
        parts.find((item) => item.type === type)?.value;
      return `${part('year')}-${part('month')}-${part('day')}`;
    },
  };
}
