import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
import path from "node:path";

import { execa } from "execa";
import { format } from "oxfmt";

import oxfmtConfig from "../oxfmt.config.ts";

type BenchmarkTask = {
  name: string;
  latency: {
    mean: number;
  };
  throughput: {
    mean: number;
  };
  rank: number;
};

type Benchmark = {
  name: string;
  tasks: BenchmarkTask[];
};

type AssertionResult = {
  benchmarks: Benchmark[];
};

type TestResult = {
  assertionResults: AssertionResult[];
  name: string;
};

type VitestBenchmarkReport = {
  success: boolean;
  testResults: TestResult[];
};

type BenchmarkResult = Benchmark & {
  fileName: string;
};

const packageRoot = path.resolve(import.meta.dirname, "..");
const benchDirectory = path.join(packageRoot, "bench");
const outputDirectory = path.join(benchDirectory, "output");
const docsDirectory = path.join(packageRoot, "docs");
const nodeJsonOutputFile = path.join(outputDirectory, "node.json");
const bunJsonOutputFile = path.join(outputDirectory, "bun.json");
const markdownOutputFile = path.join(docsDirectory, "benchmark-report.md");

const cpuInfo = cpus();
const cpu = cpuInfo.at(0);

const formatNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

if (cpu === undefined) {
  throw new Error("Unable to determine CPU information.");
}

const environment = {
  cpu: `${cpu.model} (${cpuInfo.length} logical cores)`,
  node: process.version,
  ram: `${formatNumber.format(totalmem() / 1024 ** 3)} GiB`,
};

const formatPercentage = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "always",
  style: "percent",
});

const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1) {
    return `${formatNumber.format(milliseconds * 1_000)} us`;
  }

  if (milliseconds < 1_000) {
    return `${formatNumber.format(milliseconds)} ms`;
  }

  return `${formatNumber.format(milliseconds / 1_000)} s`;
};

const escapeMarkdown = (value: string): string => {
  return value.replaceAll("|", "\\|");
};

const getBenchmarkResults = (
  report: VitestBenchmarkReport
): BenchmarkResult[] => {
  return report.testResults.flatMap((testResult) => {
    return testResult.assertionResults.flatMap((assertionResult) => {
      return assertionResult.benchmarks.map((benchmark) => ({
        ...benchmark,
        fileName: path.relative(packageRoot, testResult.name),
      }));
    });
  });
};

const getBenchmarkKey = (benchmark: BenchmarkResult): string => {
  return `${benchmark.fileName}\0${benchmark.name}`;
};

const formatImprovement = (
  nodeValue: number | undefined,
  bunValue: number | undefined,
  lowerIsBetter: boolean
): string => {
  if (nodeValue === undefined || bunValue === undefined) {
    return "—";
  }

  const improvement = lowerIsBetter
    ? nodeValue / bunValue - 1
    : bunValue / nodeValue - 1;

  return formatPercentage.format(improvement);
};

const getBenchmarkMarkdown = (
  nodeReport: VitestBenchmarkReport,
  bunReport: VitestBenchmarkReport,
  bunVersion: string
): string => {
  const nodeBenchmarks = getBenchmarkResults(nodeReport);
  const bunBenchmarks = getBenchmarkResults(bunReport);
  const bunBenchmarksByKey = new Map(
    bunBenchmarks.map((benchmark) => [getBenchmarkKey(benchmark), benchmark])
  );
  const nodeBenchmarkKeys = new Set(nodeBenchmarks.map(getBenchmarkKey));
  const benchmarkResults = [
    ...nodeBenchmarks.map((nodeBenchmark) => ({
      bunBenchmark: bunBenchmarksByKey.get(getBenchmarkKey(nodeBenchmark)),
      nodeBenchmark,
    })),
    ...bunBenchmarks
      .filter(
        (bunBenchmark) => !nodeBenchmarkKeys.has(getBenchmarkKey(bunBenchmark))
      )
      .map((bunBenchmark) => ({
        bunBenchmark,
        nodeBenchmark: undefined,
      })),
  ];

  const sections = benchmarkResults.map((benchmark) => {
    const nodeTasks = benchmark.nodeBenchmark?.tasks ?? [];
    const bunTasks = benchmark.bunBenchmark?.tasks ?? [];
    const bunTasksByName = new Map(bunTasks.map((task) => [task.name, task]));
    const nodeTaskNames = new Set(nodeTasks.map((task) => task.name));
    const tasks = [
      ...nodeTasks.map((nodeTask) => ({
        bunTask: bunTasksByName.get(nodeTask.name),
        nodeTask,
      })),
      ...bunTasks
        .filter((bunTask) => !nodeTaskNames.has(bunTask.name))
        .map((bunTask) => ({
          bunTask,
          nodeTask: undefined,
        })),
    ];
    const rows = tasks
      .toSorted(
        (left, right) =>
          (left.nodeTask?.rank ?? left.bunTask?.rank ?? 0) -
          (right.nodeTask?.rank ?? right.bunTask?.rank ?? 0)
      )
      .map(({ nodeTask, bunTask }) => {
        const task = nodeTask ?? bunTask;

        if (task === undefined) {
          throw new Error("Expected a benchmark task.");
        }

        return `| ${escapeMarkdown(task.name)} | ${nodeTask === undefined ? "—" : formatDuration(nodeTask.latency.mean)} | ${bunTask === undefined ? "—" : formatDuration(bunTask.latency.mean)} | ${formatImprovement(nodeTask?.latency.mean, bunTask?.latency.mean, true)} | ${nodeTask === undefined ? "—" : `${formatNumber.format(nodeTask.throughput.mean)} ops/s`} | ${bunTask === undefined ? "—" : `${formatNumber.format(bunTask.throughput.mean)} ops/s`} | ${formatImprovement(nodeTask?.throughput.mean, bunTask?.throughput.mean, false)} |`;
      })
      .join("\n");

    return [
      `## ${escapeMarkdown(
        benchmark.nodeBenchmark?.name ?? benchmark.bunBenchmark?.name ?? ""
      )}`,
      "",
      `Source: \`${benchmark.nodeBenchmark?.fileName ?? benchmark.bunBenchmark?.fileName ?? ""}\``,
      "",
      "| Benchmark | Node mean latency | Bun mean latency | Bun latency difference | Node throughput | Bun throughput | Bun throughput difference |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
      rows,
    ].join("\n");
  });

  return [
    "# SQLDuck benchmarks",
    "",
    "Generated with Vitest. Positive differences favor Bun: lower latency and higher throughput.",
    "",
    "| Environment | Value |",
    "| --- | --- |",
    `| Node.js | \`${environment.node}\` |`,
    `| Bun | \`${bunVersion}\` |`,
    `| CPU | ${environment.cpu} |`,
    `| RAM | ${environment.ram} |`,
    "",
    ...sections,
    "",
  ].join("\n");
};

const runBenchmark = async (
  script: "bench" | "bench-bun",
  outputFile: string
): Promise<VitestBenchmarkReport> => {
  await execa(
    "pnpm",
    [
      "run",
      script,
      "--reporter=json",
      "--outputFile",
      outputFile,
      benchDirectory,
    ],
    {
      cwd: packageRoot,
      stdio: "inherit",
    }
  );

  const report = JSON.parse(
    await readFile(outputFile, "utf8")
  ) as VitestBenchmarkReport;

  if (!report.success) {
    throw new Error(`Vitest reported failures while running "${script}".`);
  }

  return report;
};

await mkdir(outputDirectory, { recursive: true });

const nodeReport = await runBenchmark("bench", nodeJsonOutputFile);
const bunReport = await runBenchmark("bench-bun", bunJsonOutputFile);
const { stdout: bunVersion } = await execa("bun", ["--version"]);

const markdown = getBenchmarkMarkdown(nodeReport, bunReport, bunVersion);

// `docs/**/*.md` is excluded from `oxfmt.config.ts`'s `ignorePatterns` so
// that routine `lint`/`format` runs don't touch this generated file. That
// pattern only affects CLI file discovery, not this direct `format()` call,
// so the report still gets the project's normal table/markdown formatting
// right after being generated.
const { code: formattedMarkdown, errors } = await format(
  markdownOutputFile,
  markdown,
  oxfmtConfig
);
if (errors.length > 0) {
  for (const error of errors) {
    console.warn(`oxfmt: ${error.message}`);
  }
}

await writeFile(markdownOutputFile, formattedMarkdown);

console.log(`Benchmark report written to ${markdownOutputFile}`);
