/// <reference types="vite/client" />

interface ImportMetaEnv {
   readonly VITE_BASE_URL?: string;
   readonly VITE_API_URL?: string;
   readonly VITE_DATA_MODE?: string;
   readonly VITE_LOGIN_URL?: string;
   readonly VITE_PORTAL_RETURN_URL?: string;
   readonly VITE_DEMO_TOOLS?: string;
   readonly VITE_BAGAGENS_URL?: string;
   readonly VITE_QUERY_DEVTOOLS?: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
