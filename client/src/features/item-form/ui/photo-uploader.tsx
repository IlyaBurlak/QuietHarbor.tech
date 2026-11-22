import { useRef, useState, type DragEvent } from 'react';
import { Button, Spin } from 'antd';
import { ImagePlus, Star, X } from 'lucide-react';
import { MAX_ITEM_IMAGES } from '@wishlist/shared';

export interface PhotoView {
  key: string;
  url: string;
  isMain: boolean;
}

interface Props {
  photos: PhotoView[];
  /** Идёт загрузка на сервер. */
  busy?: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  onMain: (key: string) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Выбор фото кнопкой или перетаскиванием, превью, выбор главного. Проверки формата и размера до отправки. */
export function PhotoUploader({ photos, busy, onAdd, onRemove, onMain }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const accept = (list: FileList | File[]) => {
    setError(null);
    const files = Array.from(list);
    const room = MAX_ITEM_IMAGES - photos.length;
    const bad = files.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) {
      setError(
        !TYPES.includes(bad.type)
          ? `«${bad.name}»: подходят только JPG, PNG и WebP`
          : `«${bad.name}»: файл больше 5 МБ`,
      );
    }
    const good = files.filter((f) => TYPES.includes(f.type) && f.size <= MAX_BYTES);
    if (good.length > room) setError(`Можно добавить не больше ${MAX_ITEM_IMAGES} фото`);
    if (good.length && room > 0) onAdd(good.slice(0, room));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    accept(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        className={`dropzone${over ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <ImagePlus size={24} aria-hidden />
        <span>Перетащите фото сюда или</span>
        <Button
          onClick={() => input.current?.click()}
          disabled={photos.length >= MAX_ITEM_IMAGES}
          loading={busy}
        >
          Выбрать файлы
        </Button>
        <input
          ref={input}
          type="file"
          accept={TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) accept(e.target.files);
            e.target.value = '';
          }}
        />
        <small>JPG, PNG, WebP до 5 МБ, не больше {MAX_ITEM_IMAGES} фото</small>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {photos.length > 0 && (
        <ul className="photo-list">
          {photos.map((p) => (
            <li key={p.key} className={`photo-tile${p.isMain ? ' is-main' : ''}`}>
              <img src={p.url} alt="" />
              <button
                type="button"
                className="photo-tile__btn photo-tile__remove"
                aria-label="Удалить фото"
                onClick={() => onRemove(p.key)}
              >
                <X size={14} aria-hidden />
              </button>
              <button
                type="button"
                className="photo-tile__btn photo-tile__main"
                aria-pressed={p.isMain}
                onClick={() => onMain(p.key)}
              >
                <Star size={14} aria-hidden fill={p.isMain ? 'currentColor' : 'none'} />
                {p.isMain ? 'Главное' : 'Сделать главным'}
              </button>
            </li>
          ))}
          {busy && (
            <li className="photo-tile photo-tile--busy" aria-label="Загрузка">
              <Spin />
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
