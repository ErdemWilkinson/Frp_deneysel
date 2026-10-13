import { describe, expect, it } from 'vitest';
import { sslFor } from './db';

describe('sslFor', () => {
  it('CA verilirse sertifikayı doğrular', () => {
    expect(sslFor('postgres://u:p@db.example.com:5432/postgres', 'PEM')).toEqual({ ca: 'PEM' });
  });
  it('barındırılan veritabanında CA yoksa sertifika sistem güvenine göre doğrulanır', () => {
    expect(sslFor('postgresql://postgres.abc:pw@aws-0-eu.pooler.supabase.com:6543/postgres')).toBe(true);
  });
  it('doğrulamayı kapatmak yalnızca açıkça istenirse olur', () => {
    expect(sslFor('postgres://u:p@db.example.com/postgres', undefined, true)).toEqual({ rejectUnauthorized: false });
  });
  it('yerel veritabanında şifreleme istenmez', () => {
    expect(sslFor('postgres://u:p@localhost:5432/masa')).toBe(false);
    expect(sslFor('postgres://u:p@127.0.0.1/masa')).toBe(false);
  });
});
