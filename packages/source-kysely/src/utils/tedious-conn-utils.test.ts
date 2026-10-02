import { expect, describe, it } from "vitest";

import { TediousConnUtils } from "./tedious-conn-utils";

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

    it("should error when packetSize isn't a power of 2", () => {
      const jdbcDsn =
        "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false;packetSize=4097";
      expect(() => TediousConnUtils.fromJdbcDsn(jdbcDsn)).toThrow(
        "The packetSize must be a valid power of 2"
      );
    });

    it("should error when packetSize is lower than 512", () => {
      const jdbcDsn =
        "sqlserver://localhost:1433;database=db;user=sa;password=pwd;trustServerCertificate=true;encrypt=false;packetSize=256";
      expect(() => TediousConnUtils.fromJdbcDsn(jdbcDsn)).toThrow(
        "packetSize be a number greater than 51"
      );
    });
  });
});
