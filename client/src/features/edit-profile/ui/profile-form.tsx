import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Col, Form, Input, Row, Select, Switch } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { BIRTHDAY_VISIBILITY, updateProfileSchema, type Profile } from '@wishlist/shared';
import {
  PROFILE_KEY,
  updateProfileRequest,
  useSetCurrentUser,
  useUsernameAvailability,
  UsernameStatusIcon,
  usernameFieldState,
} from '@/entities/user';
import { applyApiError, checkBirthDate, isoToDateText } from '@/shared/lib';
import { DateInput } from '@/shared/ui';

const formSchema = updateProfileSchema
  .required({
    firstName: true,
    lastName: true,
    username: true,
    hideBirthYear: true,
    birthdayVisibility: true,
  })
  .omit({ birthDate: true })
  .extend({
    // В форме дата хранится текстом ДД.ММ.ГГГГ, в API уходит ГГГГ-ММ-ДД
    birthDate: z.string().superRefine((text, ctx) => {
      const check = checkBirthDate(text);
      if (!check.ok) ctx.addIssue({ code: 'custom', message: check.message });
    }),
  });
type Values = z.infer<typeof formSchema>;

const VISIBILITY_LABELS: Record<(typeof BIRTHDAY_VISIBILITY)[number], string> = {
  all: 'Все',
  friends: 'Только друзья',
  nobody: 'Никто',
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const setUser = useSetCurrentUser();
  const [formError, setFormError] = useState<string | null>(null);

  const defaults = useMemo<Values>(
    () => ({
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username ?? '',
      bio: profile.bio,
      birthDate: isoToDateText(profile.birthDate),
      hideBirthYear: profile.hideBirthYear,
      birthdayVisibility: profile.birthdayVisibility,
    }),
    [profile],
  );

  const {
    control,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { isSubmitting, isDirty, isSubmitted },
  } = useForm<Values>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: defaults,
  });

  const username = watch('username');
  const changed = username !== (profile.username ?? '');
  const availability = useUsernameAvailability(username);
  const usernameLocked = !!profile.usernameChangeAvailableAt;
  const lockedUntil = profile.usernameChangeAvailableAt
    ? new Date(profile.usernameChangeAvailableAt).toLocaleDateString('ru-RU')
    : null;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (changed && availability === 'taken') {
      setError('username', { type: 'server', message: 'Это имя уже занято' });
      return;
    }
    try {
      const check = checkBirthDate(values.birthDate);
      const res = await updateProfileRequest({
        ...values,
        birthDate: check.ok ? check.iso : null,
      });
      setUser(res.user);
      qc.setQueryData(PROFILE_KEY, res.profile);
      reset({ ...values, username: res.profile.username ?? values.username });
      void message.success('Сохранено');
    } catch (e) {
      setFormError(applyApiError(e, setError, Object.keys(defaults)));
    }
  });

  return (
    <Form layout="vertical" onFinish={onSubmit} requiredMark={false} noValidate>
      {formError && (
        <Alert
          type="error"
          showIcon
          message={formError}
          style={{ marginBottom: 16 }}
          role="alert"
        />
      )}
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Controller
            name="firstName"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Имя"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} autoComplete="given-name" />
              </Form.Item>
            )}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Controller
            name="lastName"
            control={control}
            render={({ field, fieldState }) => (
              <Form.Item
                label="Фамилия"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} autoComplete="family-name" />
              </Form.Item>
            )}
          />
        </Col>
      </Row>

      <Controller
        name="username"
        control={control}
        render={({ field, fieldState }) => {
          const s = usernameFieldState(fieldState.error?.message, changed ? availability : 'idle');
          return (
            <Form.Item
              label="Имя пользователя"
              validateStatus={s.validateStatus}
              extra={
                usernameLocked
                  ? `Менять имя можно раз в 30 дней. Следующая смена — ${lockedUntil}.`
                  : 'Менять имя можно не чаще раза в 30 дней.'
              }
              help={s.message ? <span className={s.hintClass}>{s.message}</span> : undefined}
            >
              <Input
                {...field}
                disabled={usernameLocked}
                onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                suffix={<UsernameStatusIcon status={s.status} />}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={40}
              />
            </Form.Item>
          );
        }}
      />

      <Controller
        name="bio"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="О себе"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input.TextArea
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value || null)}
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        )}
      />

      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Controller
            name="birthDate"
            control={control}
            render={({ field, fieldState }) => {
              const check = checkBirthDate(field.value);
              const incomplete = !check.ok && check.kind === 'incomplete';
              // «Введите дату полностью» показываем после ухода из поля или отправки, а не во время набора
              const showError =
                !!fieldState.error && (!incomplete || fieldState.isTouched || isSubmitted);
              const complete = check.ok && check.iso !== null;
              return (
                <Form.Item
                  label="Дата рождения"
                  htmlFor="birth-date"
                  validateStatus={showError ? 'error' : complete ? 'success' : undefined}
                  help={
                    showError ? (
                      <span className="field-hint field-hint--bad">
                        {fieldState.error?.message}
                      </span>
                    ) : complete ? (
                      <span className="field-hint field-hint--available">Дата верна</span>
                    ) : undefined
                  }
                >
                  <DateInput
                    id="birth-date"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={showError}
                    status={
                      showError && !(incomplete && !fieldState.isTouched)
                        ? 'bad'
                        : complete
                          ? 'ok'
                          : 'idle'
                    }
                  />
                </Form.Item>
              );
            }}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Controller
            name="birthdayVisibility"
            control={control}
            render={({ field }) => (
              <Form.Item label="Кто видит день и месяц" htmlFor="birthday-visibility">
                <Select
                  {...field}
                  id="birthday-visibility"
                  options={BIRTHDAY_VISIBILITY.map((v) => ({
                    value: v,
                    label: VISIBILITY_LABELS[v],
                  }))}
                />
              </Form.Item>
            )}
          />
        </Col>
      </Row>

      <Controller
        name="hideBirthYear"
        control={control}
        render={({ field }) => (
          <Form.Item extra="Другие пользователи увидят только день и месяц, без возраста.">
            <label className="switch-row">
              <Switch checked={field.value} onChange={field.onChange} />
              <span>Скрыть год рождения</span>
            </label>
          </Form.Item>
        )}
      />

      <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={!isDirty}>
        Сохранить
      </Button>
    </Form>
  );
}
