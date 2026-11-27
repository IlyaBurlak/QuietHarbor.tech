import { CheckCircleFilled } from '@ant-design/icons';
import { Form, Input } from 'antd';
import {
  Controller,
  useWatch,
  type Control,
  type FieldValues,
  type Path,
  type UseFormTrigger,
} from 'react-hook-form';
import { PasswordStrength } from './password-strength';

interface Props<T extends FieldValues> {
  control: Control<T>;
  trigger: UseFormTrigger<T>;
  name: Path<T>;
  confirmName: Path<T>;
  passwordLabel?: string;
  /** Без шкалы надёжности и галочки «совпадают» — только два поля и проверка на совпадение. */
  simple?: boolean;
}

/** Новый пароль + шкала надёжности + повтор с проверкой на лету. */
export function NewPasswordFields<T extends FieldValues>({
  control,
  trigger,
  name,
  confirmName,
  passwordLabel = 'Пароль',
  simple = false,
}: Props<T>) {
  const password = (useWatch({ control, name }) as string | undefined) ?? '';
  const confirm = (useWatch({ control, name: confirmName }) as string | undefined) ?? '';

  return (
    <>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label={passwordLabel}
            className="pw-item"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input.Password
              {...field}
              autoComplete="new-password"
              onChange={(e) => {
                field.onChange(e);
                if (confirm) void trigger(confirmName);
              }}
            />
          </Form.Item>
        )}
      />
      {!simple && <PasswordStrength password={password} />}
      <Controller
        name={confirmName}
        control={control}
        render={({ field, fieldState }) => {
          const matches = !simple && !!confirm && confirm === password && !fieldState.error;
          return (
            <Form.Item
              label="Повторите пароль"
              validateStatus={fieldState.error ? 'error' : matches ? 'success' : undefined}
              help={
                fieldState.error?.message ??
                (matches ? (
                  <span className="field-ok">
                    <CheckCircleFilled /> Пароли совпадают
                  </span>
                ) : undefined)
              }
            >
              <Input.Password {...field} autoComplete="new-password" />
            </Form.Item>
          );
        }}
      />
    </>
  );
}
