import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/features/**/*.table.ts',
  out: './drizzle',
});
