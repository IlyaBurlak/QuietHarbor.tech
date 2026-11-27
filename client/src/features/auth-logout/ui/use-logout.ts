import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { logoutRequest, ME_KEY } from '@/entities/user';

export function useLogout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    try {
      await logoutRequest();
    } finally {
      qc.clear();
      qc.setQueryData(ME_KEY, null);
      navigate('/login', { replace: true });
    }
  };
}
