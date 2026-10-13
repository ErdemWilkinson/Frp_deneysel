import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

export interface Db {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
  close(): Promise<void>;
}

const SCHEMA = [
  `create table if not exists tables (
     id int primary key default 1 check (id = 1),
     code text not null,
     state jsonb not null)`,
  `create table if not exists log_entries (
     seq bigserial primary key,
     id text not null unique,
     at bigint not null,
     actor text not null,
     visibility text not null,
     kind text not null,
     text text not null)`,
  `create table if not exists monster_overrides (
     monster_id text primary key,
     regions jsonb not null)`,
  `create table if not exists custom_monsters (
     id text primary key,
     body jsonb not null)`,
  `create table if not exists characters (
     name text primary key,
     body jsonb not null,
     at bigint not null)`,
  `create table if not exists saves (
     id text primary key,
     name text not null,
     state jsonb not null,
     at bigint not null)`,
  `create table if not exists files (
     id text primary key,
     kind text not null,
     name text not null,
     mime text not null,
     data bytea not null,
     at bigint not null)`,
  // Dosyayı kimin yüklediği; eski kayıtlarda boştur.
  `alter table files add column if not exists by_role text`,
];

export async function migrate(db: Db): Promise<void> {
  for (const sql of SCHEMA) await db.query(sql);
}

/**
 * Bağlantı şifrelemesi: CA verilirse sunucu sertifikası doğrulanır. CA yoksa ve veritabanı yerel değilse
 * sistemin güvendiği sertifikalarla doğrulanır; barındırılan veritabanının sertifikası özel bir CA'dan ise
 * DATABASE_CA verilmelidir. Doğrulamayı kapatmak yalnızca `insecure` ile, bilerek yapılır.
 */
export function sslFor(url: string, ca?: string, insecure = false): boolean | { ca: string } | { rejectUnauthorized: false } {
  if (ca) return { ca };
  let host = '';
  try { host = new URL(url).hostname; } catch { /* bozuk adres: pg kendisi hata verir */ }
  const local = host === '' || host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (local) return false;
  return insecure ? { rejectUnauthorized: false } : true;
}

export function createPgDb(url: string, ca?: string, insecure = false): Db {
  const pool = new pg.Pool({ connectionString: url, max: 3, ssl: sslFor(url, ca, insecure) });
  return {
    query: (sql, params) => pool.query(sql, params as any[]),
    close: () => pool.end(),
  };
}

/** Bellek içi (testler) ya da klasöre yazan (yerel geliştirme) Postgres. */
export async function createLiteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dirname(dataDir), { recursive: true });
  const lite = new PGlite(dataDir);
  return {
    query: (sql, params) => lite.query(sql, params as any[]),
    close: () => lite.close(),
  };
}
