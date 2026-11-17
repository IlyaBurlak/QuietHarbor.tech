import { Input } from 'antd';
import { formatDateInput } from '@/shared/lib';
import { FieldStatusIcon, type IconStatus } from './field-status-icon';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  status?: IconStatus;
  invalid?: boolean;
  id?: string;
}

/** Поле даты с маской ДД.ММ.ГГГГ: цифры с клавиатуры, точки расставляются сами. */
export function DateInput({ value, onChange, onBlur, status = 'idle', invalid, id }: Props) {
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(formatDateInput(e.target.value, value))}
      onBlur={onBlur}
      placeholder="ДД.ММ.ГГГГ"
      inputMode="numeric"
      autoComplete="bday"
      maxLength={10}
      aria-invalid={invalid}
      suffix={<FieldStatusIcon status={status} />}
    />
  );
}
