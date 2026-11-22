import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, DatePicker, Form, Input, Radio } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  createWishlistSchema,
  wishlistVisibilitySchema,
  type WishlistDto,
} from '@wishlist/shared';
import {
  VISIBILITY_OPTIONS,
  useCreateWishlist,
  useUpdateWishlist,
} from '@/entities/wishlist';
import { applyApiError } from '@/shared/lib';

const formSchema = createWishlistSchema.omit({ sortMode: true }).extend({
  visibility: wishlistVisibilitySchema,
  description: z.string().trim().max(1000, 'Не длиннее 1000 символов'),
  eventDate: z.string().nullable(),
});
type Values = z.infer<typeof formSchema>;
const FIELDS = ['title', 'description', 'visibility', 'eventDate'] as const;

/** Создание и редактирование вишлиста: передайте `wishlist` для редактирования. */
export function WishlistForm({ wishlist }: { wishlist?: WishlistDto }) {
  const navigate = useNavigate();
  const create = useCreateWishlist();
  const update = useUpdateWishlist(wishlist?.id ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, watch, formState } = useForm<Values>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      title: wishlist?.title ?? '',
      description: wishlist?.description ?? '',
      visibility: wishlist?.visibility ?? 'private',
      eventDate: wishlist?.eventDate ?? null,
    },
  });
  const visibility = watch('visibility');
  const hint = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.hint;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (wishlist) {
        await update.mutateAsync({ ...values, description: values.description || null });
        navigate(`/lists/${wishlist.id}`);
      } else {
        const created = await create.mutateAsync({
          ...values,
          description: values.description || undefined,
          sortMode: 'manual',
        });
        navigate(`/lists/${created.id}`);
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
            <Input {...field} placeholder="День рождения, Новый год…" maxLength={100} />
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
      <Controller
        name="eventDate"
        control={control}
        render={({ field }) => (
          <Form.Item label="Дата события (необязательно)">
            <DatePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              placeholder="ДД.ММ.ГГГГ"
              value={field.value ? dayjs(field.value) : null}
              onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : null)}
            />
          </Form.Item>
        )}
      />
      <Controller
        name="visibility"
        control={control}
        render={({ field }) => (
          <Form.Item label="Кто видит вишлист" extra={hint}>
            <Radio.Group
              {...field}
              optionType="button"
              buttonStyle="solid"
              options={VISIBILITY_OPTIONS.map(({ value, label }) => ({ value, label }))}
            />
          </Form.Item>
        )}
      />
      <Button type="primary" htmlType="submit" loading={formState.isSubmitting}>
        {wishlist ? 'Сохранить' : 'Создать вишлист'}
      </Button>
    </Form>
  );
}
