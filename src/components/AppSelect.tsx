import {
  Children,
  isValidElement,
  type AriaAttributes,
  type ReactNode,
} from 'react';
import { Select } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

interface Props extends AriaAttributes {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  name?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

/** Shared select: Base UI owns focus, typeahead, keyboard and popup positioning. */
export function AppSelect({
  children,
  value,
  onValueChange,
  id,
  name,
  className = '',
  required,
  disabled,
  ...aria
}: Props) {
  const options = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
    )
      return [];
    return [
      {
        value: String(child.props.value ?? ''),
        label: child.props.children,
        disabled: child.props.disabled,
      },
    ];
  });
  const placeholder = options.find(
    (option) => option.value === '' && option.disabled,
  );
  return (
    <Select.Root<string>
      id={id}
      name={name}
      required={required}
      disabled={disabled}
      value={value === '' && placeholder ? null : value}
      items={options}
      modal={false}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <Select.Trigger className={`app-select-trigger ${className}`} {...aria}>
        <Select.Value
          className="app-select-value"
          placeholder={placeholder?.label}
        />
        <Select.Icon className="app-select-chevron">
          <ChevronDown size={16} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="app-select-positioner"
          align="start"
          sideOffset={7}
          collisionPadding={12}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="app-select-popup">
            <Select.List className="app-select-list">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="app-select-option"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="app-select-check">
                    <Check size={17} strokeWidth={2.2} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
