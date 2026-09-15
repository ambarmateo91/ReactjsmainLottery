export const POSTGREST_CONFIG = {
  url: import.meta.env.VITE_POSTGREST_URL || 'http://localhost:3000',
  schema: import.meta.env.VITE_POSTGREST_SCHEMA || 'public',
  apiKey: import.meta.env.VITE_POSTGREST_API_KEY || 'dummy_key_for_direct_connection',
};

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'Sistema de Lotería',
  url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
};