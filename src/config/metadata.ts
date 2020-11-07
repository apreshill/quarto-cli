/*
* config.ts
*
* Copyright (C) 2020 by RStudio, PBC
*
* Unless you have received this program directly from RStudio pursuant
* to the terms of a commercial license agreement with RStudio, then
* this program is licensed to you under the terms of version 3 of the
* GNU General Public License. This program is distributed WITHOUT
* ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
* MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
* GPL (http://www.gnu.org/licenses/gpl-3.0.txt) for more details.
*
*/

import { dirname, join } from "path/mod.ts";
import { existsSync } from "fs/exists.ts";

import { readYaml } from "../core/yaml.ts";
import { mergeConfigs } from "../core/config.ts";
import { message } from "../core/console.ts";

import {
  kCellDefaults,
  kCellDefaultsKeys,
  kExecuteDefaults,
  kExecuteDefaultsKeys,
  kKeepMd,
  kKeepTex,
  kMetadataFormat,
  kPandocDefaults,
  kPandocDefaultsKeys,
  kPandocMetadata,
  kRenderDefaults,
  kRenderDefaultsKeys,
} from "./constants.ts";
import { defaultWriterFormat, Format } from "./format.ts";

export type Metadata = {
  [key: string]: unknown;
};

export function projectMetadata(file: string): Metadata {
  file = Deno.realPathSync(file);
  let dir: string | undefined;
  while (true) {
    // determine next directory to inspect (terminate if we can't go any higher)
    if (!dir) {
      dir = dirname(file);
    } else {
      const nextDir = dirname(dir);
      if (nextDir === dir) {
        return {};
      } else {
        dir = nextDir;
      }
    }

    // see if there is a quarto yml file there
    const quartoYml = join(dir, "_quarto.yml");
    if (existsSync(quartoYml)) {
      return readQuartoYaml(quartoYml);
    }
  }
}

export function formatFromMetadata(
  baseFormat: Format,
  to: string,
  debug?: boolean,
): Format {
  // user format options (allow any b/c this is just untyped yaml)
  // deno-lint-ignore no-explicit-any
  let format: any = {
    render: {},
    execute: {},
    pandoc: {},
    metadata: {},
  };

  // see if there is user config for this writer that we need to merge in
  const configFormats = baseFormat.metadata[kMetadataFormat];
  if (configFormats instanceof Object) {
    // deno-lint-ignore no-explicit-any
    const configFormat = (configFormats as any)[to];
    if (configFormat === "default") {
      format = metadataAsFormat({});
    } else if (configFormat instanceof Object) {
      format = metadataAsFormat(configFormat);
    }
  }

  // merge user config into default config
  const mergedFormat = mergeConfigs(
    defaultWriterFormat(to),
    baseFormat,
    format,
  );

  // force keep_md and keep_tex if we are in debug mode
  if (debug) {
    mergedFormat.render[kKeepMd] = true;
    mergedFormat.render[kKeepTex] = true;
  }

  return mergedFormat;
}

export function metadataAsFormat(metadata: Metadata): Format {
  // deno-lint-ignore no-explicit-any
  const format: { [key: string]: any } = {
    render: {},
    execute: {},
    cell: {},
    pandoc: {},
    metadata: {},
  };
  Object.keys(metadata).forEach((key) => {
    // allow stuff already sorted into a top level key through unmodified
    if (
      [
        kRenderDefaults,
        kExecuteDefaults,
        kCellDefaults,
        kPandocDefaults,
        kPandocMetadata,
      ]
        .includes(key)
    ) {
      format[key] = metadata[key];
    } else {
      // move the key into the appropriate top level key
      if (kRenderDefaultsKeys.includes(key)) {
        format.render[key] = metadata[key];
      } else if (kExecuteDefaultsKeys.includes(key)) {
        format.execute[key] = metadata[key];
      } else if (kCellDefaultsKeys.includes(key)) {
        format.cell[key] = metadata[key];
      } else if (kPandocDefaultsKeys.includes(key)) {
        format.pandoc[key] = metadata[key];
      } else {
        format.metadata[key] = metadata[key];
      }
    }
  });
  return format as Format;
}

function readQuartoYaml(file: string) {
  try {
    const yaml = readYaml(file) as Metadata;
    return yaml;
  } catch (e) {
    message("\nError reading quarto config file at " + file + "\n");
    throw e;
  }
}
