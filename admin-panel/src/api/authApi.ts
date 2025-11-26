import { api } from '../lib/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    admin: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/admin/auth/login', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/admin/auth/me');
    return response.data;
  },
};

