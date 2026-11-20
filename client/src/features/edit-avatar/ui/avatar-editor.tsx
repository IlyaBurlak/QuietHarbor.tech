import { useEffect, useRef, useState } from 'react';
import { App, Button, Space, Typography } from 'antd';
import { CameraOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@wishlist/shared';
import {
  PROFILE_KEY,
  UserAvatar,
  deleteAvatarRequest,
  uploadAvatarRequest,
  useSetCurrentUser,
} from '@/entities/user';
import { toApiError } from '@/shared/api';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarEditor({ profile, size = 96 }: { profile: Profile; size?: number }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const setUser = useSetCurrentUser();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const fullName = `${profile.firstName} ${profile.lastName}`;

  async function apply(
    run: () => Promise<{ user: Parameters<typeof setUser>[0]; profile: Profile }>,
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await run();
      setUser(res.user);
      qc.setQueryData(PROFILE_KEY, res.profile);
      return true;
    } catch (e) {
      setError(toApiError(e).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onPick(file: File | undefined) {
    if (input.current) input.current.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError('Подходят JPG, PNG и WebP');
    if (file.size > MAX_BYTES) return setError('Файл больше 5 МБ');
    // Превью показываем сразу, не дожидаясь ответа сервера
    setPreview(URL.createObjectURL(file));
    const ok = await apply(() => uploadAvatarRequest(file));
    setPreview(null);
    if (ok) void message.success('Фото обновлено');
  }

  async function onRemove() {
    if (await apply(deleteAvatarRequest)) void message.success('Фото удалено');
  }

  return (
    <div className="avatar-editor">
      {preview ? (
        <img className="avatar-editor__preview" src={preview} alt="" width={size} height={size} />
      ) : (
        <UserAvatar fullName={fullName} avatarKey={profile.avatarKey} size={size} />
      )}
      <input
        ref={input}
        type="file"
        accept={TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <Space wrap style={{ justifyContent: 'center' }}>
        <Button icon={<CameraOutlined />} loading={busy} onClick={() => input.current?.click()}>
          {profile.avatarKey ? 'Заменить фото' : 'Загрузить фото'}
        </Button>
        {profile.avatarKey && (
          <Button icon={<DeleteOutlined />} disabled={busy} onClick={() => void onRemove()}>
            Удалить
          </Button>
        )}
      </Space>
      {error ? (
        <Typography.Text type="danger" role="alert">
          {error}
        </Typography.Text>
      ) : (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          JPG, PNG или WebP до 5 МБ. Фото обрезается по центру до квадрата.
        </Typography.Text>
      )}
    </div>
  );
}
