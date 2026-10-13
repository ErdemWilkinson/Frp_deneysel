export interface Config {
  production: boolean;
  port: number;
  dmPassword: string;
  secret: string;
  databaseUrl: string | undefined;
  databaseCa: string | undefined;
  /** Sertifika doğrulamasını bilerek kapatır; yalnızca CA verilemeyen durumlar için. */
  databaseInsecureSsl: boolean;
  /** Karakter sayfası resmini okutmak için; yoksa o özellik kapalıdır. */
  deepseekKey: string | undefined;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const production = env.NODE_ENV === 'production';
  const need = (key: string, devDefault: string): string => {
    const value = env[key];
    if (value) return value;
    if (production) throw new Error(`${key} ortam değişkeni gerekli`);
    return devDefault;
  };
  return {
    production,
    port: Number(env.PORT ?? 3001),
    dmPassword: need('DM_PASSWORD', 'masa'),
    secret: need('SESSION_SECRET', 'yalnizca-gelistirme'),
    databaseUrl: production ? need('DATABASE_URL', '') : env.DATABASE_URL,
    databaseCa: env.DATABASE_CA,
    databaseInsecureSsl: env.DATABASE_SSL_INSECURE === '1',
    deepseekKey: env.DEEPSEEK_API_KEY || undefined,
  };
}
