import { useUiText } from '../i18n/useUiText';
import { useTranslation } from 'react-i18next';
import {
  useEffect,
  useRef,
  useState,
  type AriaAttributes,
  type KeyboardEvent,
} from 'react';
import { Popover } from '@base-ui/react/popover';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AppSelect } from './AppSelect';
import { systemClock } from '../services/clock';

interface Props extends AriaAttributes {
  type: 'date' | 'month' | 'datetime-local';
  value: string;
  onValueChange(value: string): void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}
const burmeseMonths = [
  'ဇန်နဝါရီ',
  'ဖေဖော်ဝါရီ',
  'မတ်',
  'ဧပြီ',
  'မေ',
  'ဇွန်',
  'ဇူလိုင်',
  'ဩဂုတ်',
  'စက်တင်ဘာ',
  'အောက်တိုဘာ',
  'နိုဝင်ဘာ',
  'ဒီဇင်ဘာ',
];
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateValue = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`);
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(dateValue(value).getTime()) &&
  iso(dateValue(value)) === value;

export function AppDatePicker({
  type,
  value,
  onValueChange,
  min,
  max,
  required,
  disabled,
  className = '',
  id,
  name,
  ...aria
}: Props) {
  const text = useUiText();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'my' ? 'my-MM-u-nu-latn' : 'en';
  const months =
    i18n.resolvedLanguage === 'my'
      ? burmeseMonths
      : Array.from({ length: 12 }, (_, i) =>
          new Date(2026, i, 1).toLocaleString(locale, { month: 'long' }),
        );
  const today = systemClock.today();
  const selected = type === 'month' ? `${value}-01` : value.slice(0, 10);
  const initial = validDate(selected) ? dateValue(selected) : dateValue(today);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const input = useRef<HTMLInputElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const focusDate = useRef<string | null>(null);
  const monthMode = type === 'month';
  const time = value.slice(11, 16) || '12:00';
  const pattern = monthMode
    ? '[0-9]{4}-[0-9]{2}'
    : type === 'datetime-local'
      ? '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}'
      : '[0-9]{4}-[0-9]{2}-[0-9]{2}';
  const allowed = (day: string) =>
    (!min || day >= min.slice(0, monthMode ? 7 : 10)) &&
    (!max || day <= max.slice(0, monthMode ? 7 : 10));
  useEffect(() => {
    let error = '';
    if (
      value &&
      ((!monthMode && !validDate(value.slice(0, 10))) ||
        (monthMode && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)))
    )
      error = text('Enter a valid date.');
    else if (
      value &&
      type === 'datetime-local' &&
      !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value)
    )
      error = text('Enter a valid date and time.');
    else if (value && min && value < min) error = `Choose ${min} or later.`;
    else if (value && max && value > max) error = `Choose ${max} or earlier.`;
    input.current?.setCustomValidity(error);
  }, [value, min, max, monthMode, type, text]);
  useEffect(() => {
    if (open && focusDate.current) {
      calendar.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focusDate.current}"]`)
        ?.focus();
      focusDate.current = null;
    }
  }, [view, open]);
  function shiftMonth(delta: number) {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  }
  function choose(day: string) {
    if (!allowed(monthMode ? day.slice(0, 7) : day)) return;
    onValueChange(
      monthMode
        ? day.slice(0, 7)
        : type === 'datetime-local'
          ? `${day}T${time}`
          : day,
    );
    if (type !== 'datetime-local') setOpen(false);
  }
  function keyDay(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const deltas: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const next = dateValue(day);
    if (event.key in deltas) next.setDate(next.getDate() + deltas[event.key]);
    else if (event.key === 'Home') next.setDate(next.getDate() - next.getDay());
    else if (event.key === 'End')
      next.setDate(next.getDate() + 6 - next.getDay());
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const dayNumber = next.getDate();
      next.setDate(1);
      next.setMonth(next.getMonth() + (event.key === 'PageUp' ? -1 : 1));
      next.setDate(
        Math.min(
          dayNumber,
          new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
        ),
      );
    } else return;
    event.preventDefault();
    if (!allowed(iso(next))) return;
    focusDate.current = iso(next);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  }
  const start = new Date(view.year, view.month, 1);
  start.setDate(1 - start.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return iso(d);
  });
  const firstEnabled = days.find(
    (day) => dateValue(day).getMonth() === view.month && allowed(day),
  );
  const focusable =
    days.includes(selected) && allowed(selected) ? selected : firstEnabled;
  const firstYear = Math.min(1900, initial.getFullYear(), view.year);
  const lastYear = Math.max(2100, initial.getFullYear(), view.year);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const d = validDate(selected)
            ? dateValue(selected)
            : dateValue(today);
          setView({ year: d.getFullYear(), month: d.getMonth() });
        }
      }}
    >
      <div className={`app-date-field ${className}`}>
        <input
          ref={input}
          id={id}
          name={name}
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={
            monthMode
              ? 'YYYY-MM'
              : type === 'datetime-local'
                ? 'YYYY-MM-DDThh:mm'
                : 'YYYY-MM-DD'
          }
          pattern={pattern}
          required={required}
          disabled={disabled}
          {...aria}
        />
        <Popover.Trigger
          type="button"
          className="app-date-open"
          disabled={disabled}
          aria-label={monthMode ? text('Choose month') : text('Choose date')}
        >
          <CalendarDays size={19} aria-hidden="true" />
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Positioner
          className="app-calendar-positioner"
          sideOffset={8}
          align="start"
          collisionPadding={12}
        >
          <Popover.Popup
            className="app-calendar"
            aria-label={monthMode ? text('Choose month') : text('Choose date')}
            initialFocus={false}
          >
            <div className="app-calendar-heading">
              <strong>
                {monthMode ? text('Choose a month') : text('Choose a date')}
              </strong>
              <Popover.Close
                className="app-calendar-close"
                aria-label={text('Close calendar')}
              >
                <X size={18} aria-hidden="true" />
              </Popover.Close>
            </div>
            <div className="app-calendar-toolbar">
              <button
                type="button"
                aria-label={
                  monthMode ? text('Previous year') : text('Previous month')
                }
                onClick={() =>
                  monthMode
                    ? setView({ ...view, year: view.year - 1 })
                    : shiftMonth(-1)
                }
              >
                <ChevronLeft size={18} />
              </button>
              {!monthMode && (
                <AppSelect
                  value={String(view.month)}
                  onValueChange={(month) =>
                    setView({ ...view, month: Number(month) })
                  }
                  aria-label={text('Month')}
                >
                  {months.map((m, i) => (
                    <option key={m} value={String(i)}>
                      {m}
                    </option>
                  ))}
                </AppSelect>
              )}
              <AppSelect
                value={String(view.year)}
                onValueChange={(year) =>
                  setView({ ...view, year: Number(year) })
                }
                aria-label={text('Year')}
              >
                {Array.from(
                  { length: lastYear - firstYear + 1 },
                  (_, i) => firstYear + i,
                ).map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </AppSelect>
              <button
                type="button"
                aria-label={monthMode ? text('Next year') : text('Next month')}
                onClick={() =>
                  monthMode
                    ? setView({ ...view, year: view.year + 1 })
                    : shiftMonth(1)
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>
            {monthMode ? (
              <div className="app-calendar-months">
                {months.map((m, i) => {
                  const day = `${view.year}-${String(i + 1).padStart(2, '0')}-01`;
                  return (
                    <button
                      type="button"
                      key={m}
                      disabled={!allowed(day.slice(0, 7))}
                      aria-pressed={day.slice(0, 7) === value}
                      onClick={() => choose(day)}
                    >
                      {i18n.resolvedLanguage === 'my'
                        ? burmeseMonths[i]
                        : new Date(2026, i, 1).toLocaleString(locale, {
                            month: 'short',
                          })}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                ref={calendar}
                className="app-calendar-grid"
                role="grid"
                aria-label={`${months[view.month]} ${view.year}`}
              >
                <div role="row" className="app-calendar-week">
                  {(i18n.resolvedLanguage === 'my'
                    ? ['နွေ', 'လာ', 'ဂါ', 'ဟူး', 'တေး', 'ကြာ', 'နေ']
                    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
                  ).map((d) => (
                    <span role="columnheader" key={d}>
                      {d}
                    </span>
                  ))}
                </div>
                {Array.from({ length: 6 }, (_, row) => (
                  <div role="row" className="app-calendar-week" key={row}>
                    {days.slice(row * 7, row * 7 + 7).map((day) => (
                      <button
                        type="button"
                        role="gridcell"
                        data-date={day}
                        key={day}
                        data-outside={dateValue(day).getMonth() !== view.month}
                        data-today={day === today}
                        aria-current={day === today ? 'date' : undefined}
                        aria-selected={day === selected}
                        tabIndex={day === focusable ? 0 : -1}
                        disabled={!allowed(day)}
                        aria-label={dateValue(day).toLocaleDateString(locale, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        onKeyDown={(e) => keyDay(e, day)}
                        onClick={() => choose(day)}
                      >
                        {dateValue(day).getDate()}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {type === 'datetime-local' && (
              <div className="app-calendar-time">
                <span>{text('Time')}</span>
                <AppSelect
                  aria-label={text('Hour')}
                  value={time.slice(0, 2)}
                  onValueChange={(h) =>
                    onValueChange(
                      `${validDate(selected) ? selected : today}T${h}:${time.slice(3, 5)}`,
                    )
                  }
                >
                  {Array.from({ length: 24 }, (_, h) =>
                    String(h).padStart(2, '0'),
                  ).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </AppSelect>
                <span>:</span>
                <AppSelect
                  aria-label={text('Minute')}
                  value={time.slice(3, 5)}
                  onValueChange={(m) =>
                    onValueChange(
                      `${validDate(selected) ? selected : today}T${time.slice(0, 2)}:${m}`,
                    )
                  }
                >
                  {Array.from({ length: 60 }, (_, m) =>
                    String(m).padStart(2, '0'),
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </AppSelect>
                <Popover.Close className="app-calendar-done">
                  {text('Done')}
                </Popover.Close>
              </div>
            )}
            <div className="app-calendar-footer">
              <button
                type="button"
                disabled={!allowed(monthMode ? today.slice(0, 7) : today)}
                onClick={() => {
                  setView({
                    year: dateValue(today).getFullYear(),
                    month: dateValue(today).getMonth(),
                  });
                  choose(today);
                }}
              >
                {monthMode ? text('This month') : text('Today')}
              </button>
              {!required && (
                <button
                  type="button"
                  onClick={() => {
                    onValueChange('');
                    setOpen(false);
                  }}
                >
                  {text('Clear')}
                </button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
