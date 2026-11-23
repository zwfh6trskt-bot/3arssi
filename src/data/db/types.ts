// The single data-access contract used by the whole app.
// Two implementations: SupabaseDb (hosted, cross-device) and LocalDb
// (device-only demo mode). Business logic never talks to either directly.

export type FilterValue = string | number | boolean | null | (string | number)[];
export type Filter = Record<string, FilterValue>;

export interface SelectOptions {
  order?: string;          // e.g. "sort_order" or "created_at.desc"
}

export type BackendMode = "neon" | "supabase" | "local";

export interface Db {
  readonly mode: BackendMode;
  /** False when the backend has no browser upload support (paste a URL instead). */
  readonly canUpload: boolean;
  select<T>(table: string, filter?: Filter, opts?: SelectOptions): Promise<T[]>;
  insert<T>(table: string, rows: object | object[]): Promise<T[]>;
  update<T>(table: string, filter: Filter, patch: object): Promise<T[]>;
  /** Insert or merge on the given unique columns (comma-separated). */
  upsert<T>(table: string, rows: object | object[], onConflict: string): Promise<T[]>;
  remove(table: string, filter: Filter): Promise<void>;
  rpc<T>(fn: string, args?: object): Promise<T>;
  uploadFile(file: File, folder: string): Promise<{ url: string; path: string }>;
  removeFile(path: string): Promise<void>;
}

export interface AuthUser { id: string; email: string }

export interface Auth {
  readonly mode: BackendMode;
  currentUser(): AuthUser | null;
  signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  /** Sets a new password from the token in the reset email link (when supported). */
  completePasswordReset?(token: string, newPassword: string): Promise<void>;
  onChange(cb: (u: AuthUser | null) => void): () => void;
  accessToken(): Promise<string | null>;
}

export class DbError extends Error {
  constructor(message: string, public code?: string, public status?: number) { super(message); }
}
