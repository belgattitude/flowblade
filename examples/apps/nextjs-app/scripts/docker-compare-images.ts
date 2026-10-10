/**
 * Build the nodejs and bun docker images (sequentially), compare their sizes and
 * save a manifest in data/docker (committed).
 *
 * Usage:
 *   pnpm docker:compare                # builds both images, then compares them
 *   pnpm docker:compare --skip-build   # only compares the existing images (fails if missing)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { execa } from "execa";
import c from "tinyrainbow";

import { CliFormat } from "#cli/format.ts";
import { CliManifest } from "#cli/manifest.ts";
import { CliReport } from "#cli/report.ts";
import { CliTable } from "#cli/table.ts";

const dockerDir = path.join(import.meta.dirname, "../docker");
const skipBuild = process.argv.includes("--skip-build");

// Keep in sync with docker/docker-compose*.yml and the docker:build-* scripts
const targets = [
  {
    buildScript: "docker:build-nodejs",
    composeFile: "docker-compose-nodejs.yml",
    image: "flowblade-nextjs-app-nodejs:latest",
    name: "nodejs",
  },
  {
    buildScript: "docker:build-bun",
    composeFile: "docker-compose-bun.yml",
    image: "flowblade-nextjs-app-bun:latest",
    name: "bun",
  },
] as const;

// docker prints decimal sizes like "552MB", "1.2GB" or "980kB"
const parseDockerSize = (size: string): number | undefined => {
  const match = /^([\d.]+)\s*([kMGT]?B)$/.exec(size.trim());
  if (match === null) {
    return undefined;
  }
  const units = { B: 1, GB: 1e9, kB: 1e3, MB: 1e6, TB: 1e12 } as const;
  return Number(match[1]) * units[match[2] as keyof typeof units];
};

type ImageInfo = {
  id: string;
  /** Disk usage as reported by `docker image ls` (decimal, rounded by docker) */
  bytes: number;
  diskSize: string;
  /** Compressed content size with the containerd image store */
  contentBytes: number;
  layers: number;
  createdAt: string;
  architecture: string;
  os: string;
};

const getImageInfo = (image: string): ImageInfo | undefined => {
  // `docker image ls` reports the disk usage (what you see in `docker images`)
  const ls = spawnSync(
    "docker",
    ["image", "ls", image, "--format", "{{.Size}}"],
    { encoding: "utf-8" }
  );
  const diskSize = ls.stdout.trim();
  const bytes = parseDockerSize(diskSize);
  const inspect = spawnSync("docker", ["image", "inspect", image], {
    encoding: "utf-8",
  });
  if (ls.status !== 0 || inspect.status !== 0 || bytes === undefined) {
    return undefined;
  }
  const [data] = JSON.parse(inspect.stdout) as {
    Id: string;
    Size: number;
    Created: string;
    Architecture: string;
    Os: string;
    RootFS: { Layers: string[] };
  }[];
  if (data === undefined) {
    return undefined;
  }
  return {
    architecture: data.Architecture,
    bytes,
    contentBytes: data.Size,
    createdAt: data.Created,
    diskSize,
    id: data.Id,
    layers: data.RootFS.Layers.length,
    os: data.Os,
  };
};

type Row = {
  name: string;
  image: string;
  info?: ImageInfo;
  /** Only set when the image has been built by this run */
  buildMs?: number;
};

const buildDurations = new Map<string, number>();

const totalStart = performance.now();

// Built one after the other (clean logs, no CPU contention between the builds)
if (!skipBuild) {
  for (const target of targets) {
    console.log(
      `${c.cyan("⚡")} ${c.bold(`Building ${target.name} image`)} ${c.dim(`(${target.composeFile})`)}`
    );
    const start = performance.now();
    const result = await execa(
      "docker",
      ["compose", "--file", target.composeFile, "build"],
      { cwd: dockerDir, reject: false, stdio: "inherit" }
    );
    if (result.failed) {
      console.error(
        `${c.red("✖")} ${c.bold(`Build of the ${target.name} image failed`)} ${c.dim(`(exit code ${result.exitCode ?? "unknown"}, ${CliFormat.seconds(start)})`)}`
      );
      process.exit(1);
    }
    buildDurations.set(target.name, Math.round(performance.now() - start));
    console.log(
      `${c.green("✔")} ${target.name} image built ${c.yellow(CliFormat.seconds(start))}\n`
    );
  }
}

const rows: Row[] = targets.map((target) => {
  const info = getImageInfo(target.image);
  const buildMs = buildDurations.get(target.name);
  return {
    image: target.image,
    name: target.name,
    ...(info === undefined ? {} : { info }),
    ...(buildMs === undefined ? {} : { buildMs }),
  };
});

const missing = targets.filter((_, i) => rows[i]?.info === undefined);

if (missing.length > 0) {
  console.error(
    [
      `${c.red("✖")} ${c.bold("Docker images not found")} ${c.dim(`(${missing.length}/${targets.length} missing)`)}`,
      ...missing.map(
        (target) =>
          `  ${c.red("✖")} ${target.name.padEnd(6)} ${c.cyan(target.image)}`
      ),
      "",
      `  ${c.yellow("tip:")} build the images first with`,
      `       ${c.bold(`pnpm ${targets[0].buildScript} && pnpm ${targets[1].buildScript}`)}`,
      `       or run ${c.bold("pnpm docker:compare")} without --skip-build`,
    ].join("\n")
  );
  process.exit(1);
}

const infos = rows.flatMap((row) => row.info ?? []);
const sizes = infos.map((info) => CliFormat.formatDecimalSize(info.bytes));
const contents = infos.map((info) =>
  CliFormat.formatDecimalSize(info.contentBytes)
);
const nameWidth = CliTable.columnWidth(rows.map((r) => r.name));
const imageWidth = CliTable.columnWidth(rows.map((r) => r.image));
const sizeWidth = CliTable.columnWidth(sizes);
const contentWidth = CliTable.columnWidth(contents);
const formatBuild = (row: Row) =>
  row.buildMs === undefined ? "n/a" : CliFormat.formatSeconds(row.buildMs);
const builds = rows.map((row) => formatBuild(row));
const buildWidth = CliTable.columnWidth(builds);

const lines = rows.map(
  (row, i) =>
    `  ${c.green("+")} ${row.name.padEnd(nameWidth)}  ${c.cyan(row.image.padEnd(imageWidth))}  ${c.bold((sizes[i] ?? "").padStart(sizeWidth))}  ${c.dim((contents[i] ?? "").padStart(contentWidth))}  ${c.yellow((builds[i] ?? "").padStart(buildWidth))}  ${c.dim(`${infos[i]?.layers} layers`)}`
);

const [first, second] = infos.map((info, i) => {
  return {
    bytes: info.bytes,
    name: rows[i]?.name ?? "",
  };
});
const comparison: string[] = [];
if (first !== undefined && second !== undefined) {
  const [smaller, larger] =
    first.bytes <= second.bytes ? [first, second] : [second, first];
  const diff = larger.bytes - smaller.bytes;
  const percent = larger.bytes > 0 ? (diff / larger.bytes) * 100 : 0;
  comparison.push(
    `  ${c.dim("diff:")}     ${c.bold(c.green(smaller.name))} is ${c.bold(CliFormat.formatDecimalSize(diff))} smaller on disk than ${c.bold(larger.name)} ${c.dim(`(-${percent.toFixed(1)}%)`)}`
  );
}

const [firstRow, secondRow] = rows;
if (
  firstRow?.buildMs !== undefined &&
  secondRow?.buildMs !== undefined &&
  firstRow.buildMs > 0 &&
  secondRow.buildMs > 0
) {
  const [faster, slower] =
    firstRow.buildMs <= secondRow.buildMs
      ? [firstRow, secondRow]
      : [secondRow, firstRow];
  const diffMs = (slower.buildMs ?? 0) - (faster.buildMs ?? 0);
  const percent = (diffMs / (slower.buildMs ?? 1)) * 100;
  comparison.push(
    `  ${c.dim("build:")}    ${c.bold(c.green(faster.name))} built ${c.bold(CliFormat.formatSeconds(diffMs))} faster than ${c.bold(slower.name)} ${c.dim(`(-${percent.toFixed(1)}%)`)}`
  );
} else {
  comparison.push(
    `  ${c.dim("build:")}    ${c.yellow("build times unavailable: the images were not built in this run (--skip-build), run without it to compare them")}`
  );
}

// committed manifest, so image size changes can be reviewed in git history
const manifestDir = path.join(import.meta.dirname, "../data/docker");
const manifestFile = path.join(manifestDir, "docker-images-manifest.json");
// when the images are not built by this run, keep the build time previously
// recorded for the very same image (same id)
const previousBuildSeconds = new Map<string, number>();
try {
  const previous = JSON.parse(fs.readFileSync(manifestFile, "utf-8")) as {
    images?: { id?: string; buildSeconds?: number | null }[];
  };
  for (const image of previous.images ?? []) {
    if (image.id !== undefined && typeof image.buildSeconds === "number") {
      previousBuildSeconds.set(image.id, image.buildSeconds);
    }
  }
} catch {
  // no previous manifest
}

const [smallest] = rows.toSorted(
  (a, b) => (a.info?.bytes ?? 0) - (b.info?.bytes ?? 0)
);
const manifestError = CliManifest.write(manifestFile, {
  generatedAt: new Date().toISOString(),
  images: rows.map((row, i) => {
    return {
      architecture: infos[i]?.architecture,
      buildSeconds:
        row.buildMs === undefined
          ? (previousBuildSeconds.get(infos[i]?.id ?? "") ?? null)
          : Number((row.buildMs / 1000).toFixed(1)),
      contentBytes: infos[i]?.contentBytes,
      createdAt: infos[i]?.createdAt,
      diskSize: infos[i]?.diskSize,
      diskSizeBytes: infos[i]?.bytes,
      id: infos[i]?.id,
      image: row.image,
      layers: infos[i]?.layers,
      name: row.name,
      os: infos[i]?.os,
    };
  }),
  smallest: smallest?.name,
});
if (manifestError !== undefined) {
  process.exitCode = 1;
}

console.log(
  [
    CliReport.titleLine(true, "Docker images compared"),
    `  ${c.dim("columns: image, disk size | content size (compressed with the containerd store) | build time | layers")}`,
    ...lines,
    ...comparison,
    CliManifest.line(manifestFile, manifestError),
    CliReport.labelLine(
      "total",
      c.bold(c.yellow(CliFormat.seconds(totalStart)))
    ),
  ].join("\n")
);
