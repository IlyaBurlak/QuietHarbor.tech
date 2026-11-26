import { useState } from 'react';
import { App, Button, Drawer, Switch } from 'antd';
import { SlidersHorizontal } from 'lucide-react';
import { HOME_WIDGETS, type HomeWidgetId } from '@wishlist/shared';
import { useHomeSettings, useSaveHomeSettings } from '@/entities/user';
import { toApiError } from '@/shared/api';

/** Кнопка «Настроить» и боковая панель: какие блоки показывать на главной. */
export function HomeSettingsButton() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const { data } = useHomeSettings();
  const save = useSaveHomeSettings();
  const hidden = data?.hidden ?? [];

  const update = async (next: HomeWidgetId[]) => {
    try {
      await save.mutateAsync({ hidden: next });
    } catch (e) {
      void message.error(toApiError(e).message);
    }
  };
  const toggle = (id: HomeWidgetId, visible: boolean) =>
    update(visible ? hidden.filter((h) => h !== id) : [...hidden, id]);

  return (
    <>
      <Button icon={<SlidersHorizontal size={16} aria-hidden />} onClick={() => setOpen(true)}>
        Настроить
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="right"
        width={360}
        title="Что показывать на главной"
        footer={
          <Button disabled={hidden.length === 0} onClick={() => void update([])}>
            Показать всё
          </Button>
        }
      >
        <p className="muted" style={{ marginTop: 0 }}>
          Выключите блоки, которые вам не нужны. Настройка сохраняется в вашем аккаунте.
        </p>
        <ul className="setting-list">
          {HOME_WIDGETS.map((w) => {
            const visible = !hidden.includes(w.id);
            const id = `hw-${w.id}`;
            return (
              <li key={w.id} className="setting-row">
                <label htmlFor={id} className="setting-row__text">
                  <strong>{w.label}</strong>
                  <span>{w.hint}</span>
                </label>
                <Switch id={id} checked={visible} onChange={(v) => void toggle(w.id, v)} />
              </li>
            );
          })}
        </ul>
      </Drawer>
    </>
  );
}
