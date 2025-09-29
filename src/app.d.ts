// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Minimal shims for external modules used in browser-only context
	declare module '@ffmpeg/ffmpeg' {
		export class FFmpeg {
			load(options?: { coreURL?: string; wasmURL?: string }): Promise<void>;
			exec(args: string[]): Promise<void>;
			writeFile(path: string, data: Uint8Array | ArrayBuffer | Blob): Promise<void>;
			readFile(path: string): Promise<Uint8Array>;
			deleteFile(path: string): Promise<void>;
			on(event: 'log', handler: (event: { message: string }) => void): void;
			on(event: 'progress', handler: (event: { progress: number }) => void): void;
		}
	}

	declare module '@ffmpeg/util' {
		export function fetchFile(file: File | Blob | ArrayBuffer | Uint8Array | string): Promise<Uint8Array>;
		export function toBlobURL(url: string, mimeType: string): Promise<string>;
	}

	// Minimal typings to satisfy tooling when SvelteKit ambient types are not generated yet
	declare module '$app/environment' {
		export const browser: boolean;
		export const dev: boolean;
		export const building: boolean;
		export const version: string;
	}

	interface ImportMetaEnv {
		readonly VITE_GOOGLE_API_KEY?: string;
		readonly VITE_GOOGLE_CLIENT_ID?: string;
		readonly VITE_GOOGLE_CLIENT_SECRET?: string;
		readonly VITE_TINYURL_API_KEY?: string;
		readonly VITE_APP_NAME?: string;
		readonly VITE_APP_VERSION?: string;
		readonly VITE_MAX_FILE_SIZE?: string;
		readonly VITE_SUPPORTED_FORMATS?: string;
	}

	interface ImportMeta {
		env: ImportMetaEnv;
	}
}

export {};
