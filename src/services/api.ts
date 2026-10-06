/**
 * Cliente HTTP do template, mantido como BASE para o futuro adapter real.
 * NÃO é importado no modo mock: nenhuma chamada de rede acontece no protótipo.
 * O TI deve revisar autenticação de aluno, envelope e tratamento do 401.
 */
import { env } from "@/config/env";
import type { ApiErrorResponse } from "@/services/types";
import axios, { type AxiosError, type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

const API_BASE_URL = env.apiUrl;

// A API não retorna mais a loginUrl; o redirect ao SSO é montado no cliente.
// Em dev use uma URL absoluta para o backend (:80); em prod, relativa (mesmo host).
const LOGIN_URL = env.loginUrl;

interface RequestMetadata {
   startTime?: number;
}

type RequestConfigWithMetadata = InternalAxiosRequestConfig & {
   metadata?: RequestMetadata;
};

type ApiError = AxiosError<ApiErrorResponse> & {
   config?: RequestConfigWithMetadata;
   responseData?: unknown;
   statusCode?: number;
};

const api: AxiosInstance = axios.create({
   baseURL: API_BASE_URL,
   timeout: 5000,
   withCredentials: true,
   headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
   },
});

function requestFulFilled(config: InternalAxiosRequestConfig) {
   const configWithMetadata = config as RequestConfigWithMetadata;
   configWithMetadata.metadata = {
      ...configWithMetadata.metadata,
      startTime: Date.now(),
   };
   return configWithMetadata;
}

const responseFulFilled = (response: AxiosResponse) => {
   if (import.meta.env.DEV) {
      const config = response.config as RequestConfigWithMetadata;
      const duration = Date.now() - (config.metadata?.startTime ?? Date.now());
      console.log(`📥 ${response.status} (${duration}ms) ${response.config.url}`);
   }
   return response;
};

const responseRejected = async (error: ApiError) => {
   if (import.meta.env.DEV) {
      const config = error.config;
      const duration = config?.metadata?.startTime ? Date.now() - config.metadata.startTime : 0;
      const status = error.response?.status || "NETWORK";
      console.error(`❌ ${status} (${duration}ms) ${config?.url ?? ""}`);

      const body = error.response?.data;
      if (body?.error) {
         console.error(`   ↳ ${body.error.code}: ${body.error.message}`);
      }
      const debug = body?.debug;
      if (debug) {
         if (debug.file) {
            console.error(`   ↳ ${debug.file}${debug.line ? `:${debug.line}` : ""}`);
         }
         if (debug.trace?.length) {
            console.error(debug.trace.join("\n"));
         }
      }
   }

   if (error.response) {
      error.statusCode = error.response.status;
      error.responseData = error.response.data;

      if (error.response.status === 401 && LOGIN_URL) {
         window.location.href = LOGIN_URL; // SSO autentica e retorna ao app por conta própria
         return new Promise<never>(() => {}); // navegação em andamento: trava a cadeia
      }
   }

   return Promise.reject(error);
};

api.interceptors.request.use(requestFulFilled, (error: AxiosError) => Promise.reject(error));
api.interceptors.response.use(responseFulFilled, responseRejected);

interface HandleApiErrorParams {
   error: unknown;
   title?: string;
   defaultMessage?: string;
   showToast?: boolean;
}

export function handleApiError({
   error,
   title = "Erro na requisição",
   defaultMessage = "Tente novamente",
   showToast = true,
}: HandleApiErrorParams) {
   const axiosError = error as AxiosError<ApiErrorResponse>;
   const isServerError = axiosError?.response?.status === 500;

   let errorMessage = axiosError?.response?.data?.error?.message || axiosError?.message || defaultMessage;
   errorMessage = errorMessage.replace(/\[.*?\]/g, "").trim();

   const errorCode = axiosError?.code;
   if (errorCode === "ECONNABORTED") {
      errorMessage = "A resposta demorou mais do que o esperado. Tente novamente.";
   }

   if (showToast) {
      toast.error(title, {
         description: isServerError ? defaultMessage : errorMessage,
      });
   }

   return errorMessage;
}

export default api;
