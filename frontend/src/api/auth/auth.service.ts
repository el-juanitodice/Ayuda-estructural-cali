import { httpClient } from '@/api/http.client';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/token';
import type { Usuario } from '@/types/auth';

interface LoginInput {
  email: string;
  clave: string;
}

interface LoginResponse {
  accessToken: string;
  usuario: Usuario;
}

export const authService = {
  getToken: (): string | null => getAccessToken(),

  login: async (input: LoginInput): Promise<LoginResponse> => {
    const r = await httpClient.post<LoginResponse>('/auth/login', input);
    setAccessToken(r.accessToken);
    return r;
  },

  yo: async (): Promise<Usuario> => {
    const r = await httpClient.get<{ usuario: Usuario }>('/auth/yo');
    return r.usuario;
  },

  recuperarClave: async (email: string): Promise<void> => {
    await httpClient.post('/auth/recuperar', { email });
  },

  definirClave: async (token: string, clave: string): Promise<void> => {
    await httpClient.post('/auth/definir-clave', { token, clave });
  },

  reautenticar: async (clave: string): Promise<{ ticket_firma: string }> => {
    return httpClient.post<{ ticket_firma: string }>('/auth/reautenticar', { clave });
  },

  logout: (): void => {
    clearAccessToken();
  },
};
