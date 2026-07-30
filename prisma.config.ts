import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import path from "node:path";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
});
