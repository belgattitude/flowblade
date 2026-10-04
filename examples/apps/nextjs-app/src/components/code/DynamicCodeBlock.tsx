"use client";

import dynamic from "next/dynamic";

export const DynamicCodeBlock = dynamic(
  async () => await import("./CodeBlock").then((mod) => mod.CodeBlock),
  {
    ssr: false,
  }
);
