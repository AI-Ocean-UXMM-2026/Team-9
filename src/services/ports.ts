/** Inject time into future domain workflows; M0 does not process occurrences. */
export interface Clock {
  now(): Date;
  today(): string;
}
