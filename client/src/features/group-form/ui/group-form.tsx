import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { CURRENCIES, createGroupSchema, type GroupDetail } from '@wishlist/shared';
import { useCreateGroup, useGroupActions } from '@/entities/group';
import { applyApiError } from '@/shared/lib';

const formSchema = createGroupSchema.extend({
  description: z.string().trim().max(1000, 'Не длиннее 1000 символов'),
  budget: z.number().min(0, 'Бюджет не может быть отрицательным').nullable(),
  currency: z.enum(CURRENCIES),
  drawDate: z.string().nullable(),
  exchangeDate: z.string().nullable(),
});
type Values = z.infer<typeof formSchema>;
const FIELDS = ['title', 'description', 'budget', 'drawDate', 'exchangeDate'] as const;

function DateField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <DatePicker
      style={{ width: '100%' }}
      format="DD.MM.YYYY"
      placeholder="ДД.ММ.ГГГГ"
      value={value ? dayjs(value) : null}
      onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : null)}
    />
  );
}

/** Создание и редактирование группы «Тайный Санта»: передайте `group` для редактирования. */
export function GroupForm({ group }: { group?: GroupDetail }) {
  const navigate = useNavigate();
  const create = useCreateGroup();
  const actions = useGroupActions(group?.id ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      title: group?.title ?? '',
      description: group?.description ?? '',
      budget: group?.budget ? Number(group.budget) : null,
      currency: (group?.currency as Values['currency']) ?? 'RUB',
      drawDate: group?.drawDate ?? null,
      exchangeDate: group?.exchangeDate ?? null,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (group) {
        await actions.update.mutateAsync({ ...values, description: values.description || null });
        navigate(`/santa/${group.id}`);
      } else {
        const created = await create.mutateAsync({
          ...values,
          description: values.description || undefined,
        });
        navigate(`/santa/${created.id}`);
      }
    } catch (e) {
      setFormError(applyApiError(e, setError, FIELDS));
    }
  });

  return (
    <Form layout="vertical" onFinish={onSubmit} requiredMark={false} noValidate>
      {formError && (
        <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} role="alert" />
      )}
      <Controller
        name="title"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Название"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input {...field} placeholder="Новый год в офисе" maxLength={100} />
          </Form.Item>
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Описание"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input.TextArea {...field} rows={3} maxLength={1000} />
          </Form.Item>
        )}
      />
      <div className="price-row">
        <Controller
          name="budget"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="Бюджет подарка (необязательно)"
              validateStatus={fieldState.error ? 'error' : undefined}
              help={fieldState.error?.message}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={field.value}
                onChange={(v) => field.onChange(v)}
                inputMode="decimal"
              />
            </Form.Item>
          )}
        />
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Form.Item label="Валюта" style={{ width: 120 }}>
              <Select
                {...field}
                options={[
                  { value: 'RUB', label: '₽ рубль' },
                  { value: 'USD', label: '$ доллар' },
                  { value: 'EUR', label: '€ евро' },
                ]}
              />
            </Form.Item>
          )}
        />
      </div>
      <div className="price-row">
        <Controller
          name="drawDate"
          control={control}
          render={({ field }) => (
            <Form.Item label="Дата жеребьёвки" style={{ flex: 1 }}>
              <DateField value={field.value} onChange={field.onChange} />
            </Form.Item>
          )}
        />
        <Controller
          name="exchangeDate"
          control={control}
          render={({ field }) => (
            <Form.Item label="Дата обмена подарками" style={{ flex: 1 }}>
              <DateField value={field.value} onChange={field.onChange} />
            </Form.Item>
          )}
        />
      </div>
      <Button type="primary" htmlType="submit" loading={formState.isSubmitting}>
        {group ? 'Сохранить' : 'Создать игру'}
      </Button>
    </Form>
  );
}
