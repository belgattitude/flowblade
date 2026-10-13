import { expect, describe, it } from "vitest";

import { TediousConnUtils } from "./tedious-conn-utils.ts";

describe("TediousConnUtils", () => {
  describe("fromJdbcDsn", () => {
    it("should parse a valid dsn", () => {
      const jdbcDsn =
        "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false;packetSize=4096";
      const tediousConfig = TediousConnUtils.fromJdbcDsn(jdbcDsn);
      expect(tediousConfig).toStrictEqual({
        authentication: {
          options: {
            password: "pwd",
            userName: "sa",
          },
          type: "default",
        },
        options: {
          database: "db",
          encrypt: false,
          packetSize: 4096,
          port: 1433,
          trustServerCertificate: true,
          useUTC: true,
        },
        server: "localhost",
      });
    });

    it.for([
      {
        reason: "isn't a power of 2",
        packetSize: 4097,
        error: "The packetSize must be a valid power of 2",
      },
      {
        reason: "is lower than 512",
        packetSize: 256,
        error: "packetSize be a number greater than 512",
      },
      {
        reason: "is greater than 32768",
        packetSize: 65_536,
        error: "packetSize be a lower than 32768",
      },
    ])("should error when packetSize $reason", ({ packetSize, error }) => {
      const jdbcDsn = `sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false;packetSize=${packetSize}`;
      expect(() => TediousConnUtils.fromJdbcDsn(jdbcDsn)).toThrow(error);
    });
  });
});
