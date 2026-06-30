// Supabase Edge Function이 쓰는 Deno 런타임 전역에 대한 최소 타입 선언.
// 이 폴더는 Deno에서 실행되며 앱의 Vite/`src` TS 빌드에 포함되지 않는다.
// Deno VSCode 확장 없이도 에디터 TS 서버가 `Deno` 전역을 인식하게 해 빨간 줄을 없앤다.

declare namespace Deno {
  export interface ServeHandlerInfo {
    remoteAddr: { hostname: string; port: number };
  }

  export type ServeHandler = (
    request: Request,
    info?: ServeHandlerInfo,
  ) => Response | Promise<Response>;

  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export function serve(handler: ServeHandler): { finished: Promise<void> };
  export function serve(
    options: ServeOptions,
    handler: ServeHandler,
  ): { finished: Promise<void> };

  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  };
}
