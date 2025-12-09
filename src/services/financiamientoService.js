import api from './axios';

export const financiamientoService = {
  getAll: async (params = {}) => {
    const response = await api.get('/financiamiento', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/financiamiento/${id}`);
    return response.data;
  },

  create: async (formularioData) => {
    const response = await api.post('/financiamiento', formularioData);
    return response.data;
  },

  update: async (id, formularioData) => {
    const response = await api.put(`/financiamiento/${id}`, formularioData);
    return response.data;
  },

  updateEstado: async (id, estado) => {
    const response = await api.put(`/financiamiento/${id}/estado`, { estado });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/financiamiento/${id}`);
    return response.data;
  }
};