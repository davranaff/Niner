const API_V1 = '/api/v1';

/** Pathnames from the app origin (`baseURL` = `HOST_API`). */
export const API_ENDPOINTS = {
  auth: {
    signUp: `${API_V1}/auth/sign-up`,
    login: `${API_V1}/auth/login/`,
    signIn: `${API_V1}/auth/sign-in`,
    confirm: `${API_V1}/auth/confirm`,
    refresh: `${API_V1}/auth/refresh`,
  },
  users: {
    me: `${API_V1}/users/me`,
  },
  products: {
    list: `${API_V1}/products/`,
    search: `${API_V1}/products/search/`,
    bulkDelete: `${API_V1}/products/bulk-delete/`,
    detail: (id: string) => `${API_V1}/products/${id}/`,
    stock: (id: string) => `${API_V1}/products/${id}/stock/`,
  },
  clients: {
    list: `${API_V1}/clients/`,
    search: `${API_V1}/clients/search/`,
    bulkDelete: `${API_V1}/clients/bulk-delete/`,
    bulkCreateExcel: `${API_V1}/clients/bulk-create-excel/`,
    detail: (id: string) => `${API_V1}/clients/${id}/`,
  },
  sales: {
    list: `${API_V1}/sales/`,
    detail: (id: string) => `${API_V1}/sales/${id}/`,
  },
  debts: {
    list: `${API_V1}/debts/`,
    detail: (id: string) => `${API_V1}/debts/${id}/`,
    pay: (id: string) => `${API_V1}/debts/${id}/pay/`,
  },
  // Minimals shop aliases
  product: {
    list: `${API_V1}/products/`,
    search: `${API_V1}/products/search/`,
    details: `${API_V1}/products/`,
  },
  // Template demo (no Django equivalent)
  chat: '/api/chat',
  kanban: '/api/kanban',
  calendar: '/api/calendar',
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
} as const;
