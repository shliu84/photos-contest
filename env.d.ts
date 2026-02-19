/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_SECRET_KEY: string;
}
