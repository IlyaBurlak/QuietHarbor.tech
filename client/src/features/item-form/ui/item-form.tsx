import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Form, Input, InputNumber, Radio, Select } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  CURRENCIES,
  MAX_ITEM_LINKS,
  httpUrlSchema,
  itemInputSchema,
  type WishlistItemDto,
} from '@wishlist/shared';
import {
  PRIORITY_LABEL,
  useCreateItem,
  useItemImages,
  useUpdateItem,
  uploadImageRequest,
} from '@/entities/wishlist';
import { applyApiError, fileUrl } from '@/shared/lib';
import { PhotoUploader, type PhotoView } from './photo-uploader';

/** В форме пустая ссылка — пустая строка, а не null. */
const formSchema = itemInputSchema
  .omit({ url: true, links: true, price: true, description: true, note: true })
  .extend({
    description: z.string().trim().max(2000, 'Не длиннее 2000 символов'),
    note: z.string().trim().max(300, 'Не длиннее 300 символов'),
    price: z.number().min(0, 'Цена не может быть отрицательной').nullable(),
    currency: z.enum(CURRENCIES),
    priority: z.number().int().min(1).max(3),
    url: z.union([z.literal(''), httpUrlSchema]),
    links: z
      .array(z.object({ url: httpUrlSchema, label: z.string().trim().max(100, 'Не длиннее 100 символов') }))
      .max(MAX_ITEM_LINKS),
  });
type Values = z.infer<typeof formSchema>;

interface Staged {
  key: string;
  file: File;
  url: string;
}

interface Props {
  wishlistId: string;
  /** Для редактирования. Без него форма создаёт товар. */
  item?: WishlistItemDto;
}

export function ItemForm({ wishlistId, item }: Props) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const create = useCreateItem(wishlistId);
  const update = useUpdateItem(item?.id ?? '');
  const images = useItemImages(item?.id ?? '');
  const [staged, setStaged] = useState<Staged[]>([]);
  const [mainKey, setMainKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState } = useForm<Values>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      title: item?.title ?? '',
      description: item?.description ?? '',
      note: item?.note ?? '',
      price: item?.price ? Number(item.price) : null,
      currency: (item?.currency as Values['currency']) ?? 'RUB',
      priority: item?.priority ?? 2,
      url: item?.url ?? '',
      links: item?.links.map((l) => ({ url: l.url, label: l.label ?? '' })) ?? [],
    },
  });
  const links = useFieldArray({ control, name: 'links' });

  const photos: PhotoView[] = useMemo(
    () =>
      item
        ? item.images.map((i) => ({ key: i.id, url: fileUrl(i.fileKey), isMain: i.isMain }))
        : staged.map((s, idx) => ({
            key: s.key,
            url: s.url,
            isMain: mainKey ? s.key === mainKey : idx === 0,
          })),
    [item, staged, mainKey],
  );

  const addPhotos = async (files: File[]) => {
    if (!item) {
      setStaged((prev) => [
        ...prev,
        ...files.map((file) => ({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
      ]);
      return;
    }
    for (const file of files) {
      try {
        await images.upload.mutateAsync(file);
      } catch (e) {
        void message.error(applyApiError(e, () => undefined, []) ?? 'Не удалось загрузить фото');
      }
    }
  };

  const removePhoto = (key: string) => {
    if (item) images.remove.mutate(key);
    else setStaged((prev) => prev.filter((s) => s.key !== key));
  };
  const mainPhoto = (key: string) => {
    if (item) images.setMain.mutate(key);
    else setMainKey(key);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const body = {
      ...values,
      url: values.url || null,
      links: values.links.map((l) => ({ url: l.url, label: l.label || undefined })),
    };
    try {
      if (item) {
        await update.mutateAsync(body);
      } else {
        const created = await create.mutateAsync(body);
        // Главное фото грузим первым, чтобы оно стало главным
        const ordered = [...staged].sort((a, b) => Number(b.key === mainKey) - Number(a.key === mainKey));
        for (const s of ordered) {
          try {
            await uploadImageRequest(created.id, s.file);
          } catch {
            void message.warning(`Не удалось загрузить «${s.file.name}»`);
          }
        }
      }
      void message.success('Сохранено');
      navigate(`/lists/${wishlistId}`);
    } catch (e) {
      setFormError(applyApiError(e, setError, ['title', 'description', 'note', 'price', 'url']));
    }
  });

  return (
    <Form layout="vertical" onFinish={onSubmit} requiredMark={false} noValidate>
      {formError && (
        <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} role="alert" />
      )}

      <Form.Item label="Фото">
        <PhotoUploader
          photos={photos}
          busy={images.upload.isPending}
          onAdd={(f) => void addPhotos(f)}
          onRemove={removePhoto}
          onMain={mainPhoto}
        />
      </Form.Item>

      <Controller
        name="title"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Название"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input {...field} maxLength={150} />
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
            <Input.TextArea {...field} rows={3} maxLength={2000} />
          </Form.Item>
        )}
      />
      <Controller
        name="note"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Заметка"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input {...field} placeholder="Размер, цвет…" maxLength={300} />
          </Form.Item>
        )}
      />

      <div className="price-row">
        <Controller
          name="price"
          control={control}
          render={({ field, fieldState }) => (
            <Form.Item
              label="Цена (необязательно)"
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

      <Controller
        name="priority"
        control={control}
        render={({ field }) => (
          <Form.Item label="Насколько хочется">
            <Radio.Group
              {...field}
              optionType="button"
              buttonStyle="solid"
              options={[3, 2, 1].map((v) => ({ value: v, label: PRIORITY_LABEL[v] }))}
            />
          </Form.Item>
        )}
      />

      <Controller
        name="url"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item
            label="Ссылка на магазин"
            validateStatus={fieldState.error ? 'error' : undefined}
            help={fieldState.error?.message}
          >
            <Input {...field} placeholder="https://" inputMode="url" autoCapitalize="none" />
          </Form.Item>
        )}
      />

      <Form.Item label="Похожие товары" extra={`До ${MAX_ITEM_LINKS} ссылок с подписью`}>
        <ul className="link-rows">
          {links.fields.map((f, i) => (
            <li key={f.id} className="link-row">
              <Controller
                name={`links.${i}.url`}
                control={control}
                render={({ field, fieldState }) => (
                  <Form.Item
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                    style={{ flex: 2, marginBottom: 0 }}
                  >
                    <Input {...field} placeholder="https://" aria-label={`Ссылка ${i + 1}`} />
                  </Form.Item>
                )}
              />
              <Controller
                name={`links.${i}.label`}
                control={control}
                render={({ field }) => (
                  <Form.Item style={{ flex: 1, marginBottom: 0 }}>
                    <Input {...field} placeholder="Подпись" aria-label={`Подпись ${i + 1}`} />
                  </Form.Item>
                )}
              />
              <Button
                type="text"
                aria-label="Убрать ссылку"
                icon={<Trash2 size={16} aria-hidden />}
                onClick={() => links.remove(i)}
              />
            </li>
          ))}
        </ul>
        {links.fields.length < MAX_ITEM_LINKS && (
          <Button
            icon={<Plus size={16} aria-hidden />}
            onClick={() => links.append({ url: '', label: '' })}
          >
            Добавить ещё
          </Button>
        )}
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={formState.isSubmitting}>
        {item ? 'Сохранить' : 'Добавить желание'}
      </Button>
    </Form>
  );
}
