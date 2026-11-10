import { DuckDBInstance } from "@duckdb/node-api";
import { reset } from "@logtape/logtape";
import type { LogRecord } from "@logtape/logtape";
import { afterEach, beforeEach, describe, expect } from "vitest";

import { configureTestLogger } from "#tests/utils/configure-test-logger.ts";
import { createDuckTestIsolated } from "#tests/utils/duck-test.ts";

import { DuckSecretsManager } from "./duck-secrets-manager.ts";

const it = createDuckTestIsolated({
  max_memory: "5M",
  threads: 1,
});

// The `http` secret type is built in: no extension to download
describe("DuckSecretsManager", () => {
  describe("create", () => {
    it("should create a temporary secret with redacted sensitive values", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      await expect(
        secrets.create({
          name: "api_token",
          type: "http",
          bearerToken: "s3cret",
          scope: "https://api.example.com/",
        })
      ).resolves.toBe(true);

      await expect(secrets.list()).resolves.toStrictEqual([
        {
          name: "api_token",
          type: "http",
          provider: "config",
          persistent: false,
          storage: "memory",
          scope: ["https://api.example.com/"],
          secretString: expect.stringContaining("bearer_token=redacted"),
        },
      ]);
    });

    it("should accept multiple scopes and additional options", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      await secrets.create({
        name: "proxy",
        type: "http",
        scope: ["https://a.example.com/", "https://b.example.com/"],
        options: { httpProxy: "http://proxy:3128" },
      });

      const [secret] = await secrets.list({ name: "proxy" });
      expect(secret?.scope).toStrictEqual([
        "https://a.example.com/",
        "https://b.example.com/",
      ]);
      expect(secret?.secretString).toContain("http_proxy=http://proxy:3128");
    });

    it("should fail, replace or ignore an existing secret", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      const secret = {
        name: "proxy",
        type: "http",
        httpProxy: "http://first:3128",
      } as const;
      await secrets.create(secret);

      await expect(secrets.create(secret)).rejects.toThrow("already exists");

      await secrets.create(
        { ...secret, httpProxy: "http://ignored:3128" },
        { onConflict: "ignore" }
      );
      const [ignored] = await secrets.list();
      expect(ignored?.secretString).toContain("first");

      await secrets.create(
        { ...secret, httpProxy: "http://second:3128" },
        { onConflict: "replace" }
      );
      const [replaced] = await secrets.list();
      expect(replaced?.secretString).toContain("second");
    });

    it("should be visible from the other connections of the instance", async () => {
      const instance = await DuckDBInstance.create(":memory:");
      const conn = await instance.connect();
      const otherConn = await instance.connect();
      try {
        await new DuckSecretsManager(conn).create({
          name: "shared",
          type: "http",
          bearerToken: "s3cret",
        });
        await expect(
          new DuckSecretsManager(otherConn).list({ type: "http" })
        ).resolves.toMatchObject([{ name: "shared" }]);
      } finally {
        conn.closeSync();
        otherConn.closeSync();
        instance.closeSync();
      }
    });
  });

  describe("drop", () => {
    it("should drop a secret", async ({ conn }) => {
      const secrets = new DuckSecretsManager(conn);
      await secrets.create({ name: "api_token", type: "http" });
      await expect(secrets.drop("api_token")).resolves.toBe(true);
      await expect(secrets.list()).resolves.toStrictEqual([]);
    });

    it("should fail on a missing secret unless ifExists is set", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      await expect(secrets.drop("missing")).rejects.toThrow(
        "non-existent secret"
      );
      await expect(secrets.drop("missing", { ifExists: true })).resolves.toBe(
        true
      );
    });
  });

  describe("which", () => {
    it("should return the secret with the longest matching scope", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      await secrets.create({
        name: "site",
        type: "http",
        scope: "https://example.com/",
      });
      await secrets.create({
        name: "site_exports",
        type: "http",
        scope: "https://example.com/exports/",
      });

      await expect(
        secrets.which("https://example.com/exports/users.csv", "http")
      ).resolves.toMatchObject({ name: "site_exports" });
      await expect(
        secrets.which("https://example.com/other.csv", "http")
      ).resolves.toMatchObject({ name: "site" });
      await expect(
        secrets.which("https://elsewhere.com/other.csv", "http")
      ).resolves.toBeNull();
    });
  });

  describe("withSecret", () => {
    it("should create a secret for the function and drop it afterwards", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      const result = await secrets.withSecret(
        { type: "http", bearerToken: "s3cret" },
        async (name) => {
          expect(name).toMatch(/^flowblade_tmp_[\da-f]{32}$/);
          await expect(secrets.list({ name })).resolves.toHaveLength(1);
          return "done";
        }
      );
      expect(result).toBe("done");
      await expect(secrets.list()).resolves.toStrictEqual([]);
    });

    it("should drop the secret when the function throws", async ({ conn }) => {
      const secrets = new DuckSecretsManager(conn);
      await expect(
        secrets.withSecret({ name: "named", type: "http" }, () => {
          throw new Error("boom");
        })
      ).rejects.toThrow("boom");
      await expect(secrets.list()).resolves.toStrictEqual([]);
    });
  });

  describe("sql injection", () => {
    it("should reject invalid names, types, providers and options before running them", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      await expect(
        secrets.create({ name: "x; DROP TABLE users", type: "http" })
      ).rejects.toThrow("Invalid secret name 'x; DROP TABLE users'");
      await expect(
        secrets.create({ name: "x", type: "custom", customType: "s3) --" })
      ).rejects.toThrow("Invalid secret type 's3) --'");
      await expect(
        secrets.create({
          name: "x",
          type: "custom",
          customType: "http",
          provider: "config, x",
        })
      ).rejects.toThrow("Invalid secret provider 'config, x'");
      await expect(
        secrets.create({
          name: "x",
          type: "http",
          options: { "a 'b'": "c" },
        })
      ).rejects.toThrow("Invalid secret option");
      await expect(secrets.drop("x; DROP TABLE users")).rejects.toThrow(
        "Invalid secret name"
      );
    });

    it("should bind option values and escape scopes and filters", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      await secrets.create({
        name: "quoted",
        type: "http",
        httpProxy: "http://it's', X 'y",
        scope: "https://it's.example.com/",
      });
      const [secret] = await secrets.list({ name: "quoted" });
      expect(secret?.secretString).toContain("http_proxy=http://it's', X 'y");
      expect(secret?.scope).toStrictEqual(["https://it's.example.com/"]);
      await expect(
        secrets.list({ name: "x' OR '1'='1" })
      ).resolves.toStrictEqual([]);
    });
  });

  describe("logging", () => {
    let logBuffer: LogRecord[] = [];
    beforeEach(async () => {
      await configureTestLogger(logBuffer);
    });
    afterEach(async () => {
      await reset();
      logBuffer = [];
    });

    it("should never log nor throw the secret values when the creation fails", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      const error = await secrets
        .create({
          name: "failing",
          type: "http",
          bearerToken: "s3cret-token",
          options: { unknownOption: "s3cret-option" },
        })
        .catch((error_: unknown) => error_);

      expect(error).toBeInstanceOf(Error);
      const errorRecord = logBuffer.find((record) => record.level === "error");
      expect(errorRecord?.properties.sql).toBe(
        "CREATE TEMPORARY SECRET failing (TYPE http, BEARER_TOKEN $1, UNKNOWN_OPTION $2)"
      );
      const logged = JSON.stringify([
        logBuffer.map((record) => [record.message, record.properties]),
        (error as Error).message,
        String((error as Error).cause),
      ]);
      expect(logged).not.toContain("s3cret");
    });
  });

  // The azure secret type comes with the azure extension, downloaded once
  describe("azure", { tags: ["network"], timeout: 30_000 }, () => {
    it("should create an azure secret from a connection string", async ({
      conn,
    }) => {
      const secrets = new DuckSecretsManager(conn);
      await secrets.create({
        name: "exports_azure",
        type: "azure",
        connectionString:
          "DefaultEndpointsProtocol=https;AccountName=acc;AccountKey=a2V5;",
        scope: "az://exports/",
      });

      await expect(
        secrets.which("az://exports/users.parquet", "azure")
      ).resolves.toMatchObject({
        name: "exports_azure",
        type: "azure",
        secretString: expect.stringContaining("connection_string=redacted"),
      });
    });
  });
});
