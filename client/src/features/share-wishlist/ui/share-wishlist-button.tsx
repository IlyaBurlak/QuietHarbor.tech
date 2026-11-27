import { useState } from 'react';
import { App, Button, Input, Modal, Popconfirm } from 'antd';
import { Copy, Share2 } from 'lucide-react';
import type { WishlistDto } from '@wishlist/shared';
import { shareUrl, useRegenerateLink } from '@/entities/wishlist';

/** «Поделиться»: копирование ссылки и перевыпуск (старая ссылка перестаёт работать). */
export function ShareWishlistButton({ wishlist }: { wishlist: WishlistDto }) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const regenerate = useRegenerateLink(wishlist.id);
  const url = shareUrl(wishlist.shareSlug);
  const isPrivate = wishlist.visibility === 'private';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      void message.success('Ссылка скопирована');
    } catch {
      void message.error('Не удалось скопировать — выделите ссылку вручную');
    }
  };

  return (
    <>
      <Button icon={<Share2 size={16} aria-hidden />} onClick={() => setOpen(true)}>
        Поделиться
      </Button>
      <Modal title="Поделиться вишлистом" open={open} onCancel={() => setOpen(false)} footer={null}>
        {isPrivate ? (
          <p>Сейчас вишлист виден только вам. Чтобы поделиться, откройте доступ в настройках: «По ссылке» или «Для друзей».</p>
        ) : (
          <p>
            {wishlist.visibility === 'link'
              ? 'Любой, у кого есть эта ссылка, сможет открыть вишлист.'
              : 'Ссылка откроется только вашим друзьям.'}
          </p>
        )}
        <Input.Group compact style={{ display: 'flex' }}>
          <Input readOnly value={url} aria-label="Ссылка на вишлист" onFocus={(e) => e.target.select()} />
          <Button icon={<Copy size={16} aria-hidden />} onClick={() => void copy()} aria-label="Скопировать ссылку" />
        </Input.Group>
        <Popconfirm
          title="Перевыпустить ссылку?"
          description="Старая ссылка перестанет работать, всем придётся отправить новую."
          okText="Перевыпустить"
          cancelText="Отмена"
          onConfirm={async () => {
            await regenerate.mutateAsync();
            void message.success('Ссылка обновлена');
          }}
        >
          <Button type="link" style={{ paddingLeft: 0, marginTop: 8 }} loading={regenerate.isPending}>
            Перевыпустить ссылку
          </Button>
        </Popconfirm>
      </Modal>
    </>
  );
}
