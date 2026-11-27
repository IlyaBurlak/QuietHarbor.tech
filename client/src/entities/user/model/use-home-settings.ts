import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HomeSettings } from '@wishlist/shared';
import { fetchHomeSettings, saveHomeSettings } from '../api/users-api';

export const HOME_SETTINGS_KEY = ['home-settings'] as const;

export const useHomeSettings = () =>
  useQuery({ queryKey: HOME_SETTINGS_KEY, queryFn: fetchHomeSettings, staleTime: Infinity });

/** Сохранение с мгновенным откликом: переключатель меняется сразу, при ошибке возвращается. */
export function useSaveHomeSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveHomeSettings,
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: HOME_SETTINGS_KEY });
      const prev = qc.getQueryData<HomeSettings>(HOME_SETTINGS_KEY);
      qc.setQueryData(HOME_SETTINGS_KEY, next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(HOME_SETTINGS_KEY, ctx.prev);
    },
  });
}
