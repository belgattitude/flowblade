import { createHmac } from "node:crypto";

// Well-known development credentials of the Azurite emulator
const account = "devstoreaccount1";
const accountKey =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";
const apiVersion = "2021-08-06";

export type AzuriteInfo = {
  /** ie: http://127.0.0.1:32768/devstoreaccount1 */
  blobEndpoint: string;
  connectionString: string;
};

export const getAzuriteInfo = (host: string, port: number): AzuriteInfo => {
  const blobEndpoint = `http://${host}:${port}/${account}`;
  return {
    blobEndpoint,
    connectionString: `DefaultEndpointsProtocol=http;AccountName=${account};AccountKey=${accountKey};BlobEndpoint=${blobEndpoint};`,
  };
};

/**
 * Create a blob container with the storage REST api (Shared Key
 * authorization), DuckDB can't create containers.
 */
export const createAzuriteContainer = async (
  info: AzuriteInfo,
  container: string
): Promise<void> => {
  const date = new Date().toUTCString();
  const stringToSign = [
    "PUT",
    // Content-Encoding, Content-Language, Content-Length, Content-MD5,
    // Content-Type, Date, If-Modified-Since, If-Match, If-None-Match,
    // If-Unmodified-Since, Range
    ...Array.from({ length: 11 }, () => ""),
    `x-ms-date:${date}\nx-ms-version:${apiVersion}`,
    `/${account}/${account}/${container}\nrestype:container`,
  ].join("\n");
  const signature = createHmac("sha256", Buffer.from(accountKey, "base64"))
    .update(stringToSign, "utf8")
    .digest("base64");

  const response = await fetch(
    `${info.blobEndpoint}/${container}?restype=container`,
    {
      method: "PUT",
      headers: {
        "x-ms-date": date,
        "x-ms-version": apiVersion,
        Authorization: `SharedKey ${account}:${signature}`,
      },
    }
  );
  if (response.status !== 201) {
    throw new Error(
      `Failed to create container '${container}': ${response.status} ${await response.text()}`
    );
  }
};
