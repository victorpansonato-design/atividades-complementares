export interface ApiResponse<T> {
   success: boolean;
   data: T;
   message?: string;
}

export interface ApiErrorDebug {
   file?: string;
   line?: number;
   trace?: string[];
}

export interface ApiErrorBody {
   code: string;
   message: string;
   loginUrl?: string;
}

export interface ApiErrorResponse {
   success: false;
   error: ApiErrorBody;
   debug?: ApiErrorDebug;
}
