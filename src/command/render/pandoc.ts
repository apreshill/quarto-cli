/*
* pandoc.ts
*
* Copyright (C) 2020 by RStudio, PBC
*
*/

import { ld } from "lodash/mod.ts";

import { dirname } from "path/mod.ts";
import { stringify } from "encoding/yaml.ts";

import { execProcess, ProcessResult } from "../../core/process.ts";
import { message } from "../../core/console.ts";

import { Format, FormatPandoc } from "../../config/format.ts";
import { Metadata } from "../../config/metadata.ts";
import { binaryPath } from "../../core/resources.ts";

import { RenderFlags } from "./flags.ts";
import {
  generateDefaults,
  pandocDefaultsMessage,
  writeDefaultsFile,
} from "./defaults.ts";
import { removeFilterParmas, setFilterParams } from "./filters.ts";

// options required to run pandoc
export interface PandocOptions {
  // input file
  input: string;
  // target format
  format: Format;
  // command line args for pandoc
  args: string[];
  // command line flags (e.g. could be used
  // to specify e.g. quiet or pdf engine)
  flags?: RenderFlags;
}

export async function runPandoc(
  options: PandocOptions,
  sysFilters: string[],
): Promise<ProcessResult> {
  // build the pandoc command (we'll feed it the input on stdin)
  const cmd = [binaryPath("pandoc")];

  // generate defaults and write a defaults file if need be
  const allDefaults = await generateDefaults(options, sysFilters);
  if (allDefaults) {
    const defaultsFile = await writeDefaultsFile(allDefaults);
    cmd.push("--defaults", defaultsFile);
  }

  // set parameters required for filters
  setFilterParams(options);

  // read the input file then append the metadata to the file (this is to that)
  // our fully resolved metadata, which incorporates project and format-specific
  // values, overrides the metadata contained within the file). we'll feed the
  // input to pandoc on stdin
  const input = Deno.readTextFileSync(options.input) +
    "\n\n<!-- -->\n" +
    `\n---\n${stringify(options.format.metadata || {})}\n---\n`;

  // build command line args
  const args = [...options.args];

  // provide default title based on filename if necessary
  if (!options.format.metadata["title"]) {
    args.push(
      "--metadata",
      "title:" + options.input.slice(0, options.input.indexOf(".")),
    );
  }

  // propagate quiet
  if (options.flags?.quiet) {
    args.push("--quiet");
  }

  // add user command line args
  cmd.push(...args);

  // print full resolved input to pandoc
  if (!options.flags?.quiet && options.format.metadata) {
    runPandocMessage(
      args,
      allDefaults,
      sysFilters,
      options.format.metadata,
    );
  }

  // apply workaround for .output suppression
  // https://github.com/jgm/pandoc/issues/6841#issuecomment-728281039
  // NOTE: only required for pandoc < v2.11.2 so we can probably remove this
  cmd.push("--ipynb-output=all");

  // run pandoc
  return await execProcess(
    {
      cmd,
      cwd: dirname(options.input),
    },
    input,
  );
}

function runPandocMessage(
  args: string[],
  pandoc: FormatPandoc | undefined,
  sysFilters: string[],
  metadata: Metadata,
  debug?: boolean,
) {
  message(`pandoc ${args.join(" ")}`, { bold: true });
  if (pandoc) {
    message(pandocDefaultsMessage(pandoc, sysFilters, debug), { indent: 2 });
  }

  if (Object.keys(metadata).length > 0) {
    message("metadata", { bold: true });
    const printMetadata = ld.cloneDeep(metadata) as Metadata;
    delete printMetadata.format;

    // remove filter params
    removeFilterParmas(printMetadata);

    // print message
    message(stringify(printMetadata), { indent: 2 });
  }
}
