import type { FormatOptions } from "../api/format.ts";
import type { Metadata } from "../core/metadata.ts";

import { rmdEngine } from "./rmd.ts";
import { ipynbEngine } from "./ipynb.ts";

export interface ComputationEngine {
  name: string;
  canHandle: (ext: string) => boolean;
  metadata: (file: string) => Promise<Metadata>;
  process: (
    file: string,
    format: FormatOptions,
    outputFile: string,
  ) => Promise<void>;
}

export function computationEngineForFile(ext: string) {
  const engines = [
    rmdEngine,
    ipynbEngine,
  ];

  for (const engine of engines) {
    if (engine.canHandle(ext)) {
      return engine;
    }
  }

  return null;
}
