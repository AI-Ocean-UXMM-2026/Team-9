/** Inject time into date-dependent domain workflows. */
export interface Clock {
  now(): Date;
  today(): string;
}
