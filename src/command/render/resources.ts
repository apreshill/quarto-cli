/*
* resources.ts
*
* Copyright (C) 2020 by RStudio, PBC
*
*/

import { dirname, join } from "path/mod.ts";
import { existsSync } from "fs/mod.ts";

import { ResolvedPathGlobs, resolvePathGlobs } from "../../core/path.ts";
import { engineIgnoreGlobs } from "../../execute/engine.ts";
import { kQuartoScratch } from "../../project/project-scratch.ts";
import { extractResolvedResourceFilenamesFromQmd } from "../../execute/ojs/extract-resources.ts";
import { asMappedString } from "../../core/mapped-text.ts";
import { RenderedFile, RenderResourceFiles } from "./types.ts";
import { PartitionedMarkdown } from "../../core/pandoc/types.ts";

export function resourcesFromMetadata(resourcesMetadata?: unknown) {
  // interrogate / typecast raw yaml resources into array of strings
  const resources: string[] = [];
  if (resourcesMetadata) {
    if (Array.isArray(resourcesMetadata)) {
      for (const file of resourcesMetadata) {
        resources.push(String(file));
      }
    } else {
      resources.push(String(resourcesMetadata));
    }
  }
  return resources;
}

// FIXME markdown should come as a MappedString but we don't want to port
// over the entirety of quarto just yet.
export async function resolveFileResources(
  rootDir: string,
  fileDir: string,
  markdown: string,
  globs: string[],
): Promise<ResolvedPathGlobs> {
  const ignore = engineIgnoreGlobs()
    .concat(kQuartoScratch + "/")
    .concat(["**/.*", "**/.*/**"]); // hidden (dot prefix))
  const resources = resolvePathGlobs(fileDir, globs, ignore);
  if (markdown.length > 0) {
    resources.include.push(
      ...(await extractResolvedResourceFilenamesFromQmd(
        asMappedString(markdown),
        fileDir,
        rootDir,
      )),
    );
  }
  return resources;
}

export function resourceFilesFromRenderedFile(
  baseDir: string,
  renderedFile: RenderedFile,
  partitioned?: PartitionedMarkdown,
) {
  return resourceFilesFromFile(
    baseDir,
    renderedFile.file,
    renderedFile.resourceFiles,
    renderedFile.selfContained,
    renderedFile.supporting,
    partitioned,
  );
}

export async function resourceFilesFromFile(
  baseDir: string,
  file: string,
  resources: RenderResourceFiles,
  selfContained: boolean,
  supporting?: string[],
  partitioned?: PartitionedMarkdown,
) {
  const resourceDir = join(baseDir, dirname(file));
  const markdown = partitioned ? partitioned.markdown : "";
  const globs = resources.globs;
  const fileResourceFiles = await resolveFileResources(
    baseDir,
    resourceDir,
    markdown,
    globs,
  );

  // add the explicitly discovered files (if they exist and
  // the output isn't self-contained)
  if (!selfContained) {
    const resultFiles = resources.files
      .map((file) => join(resourceDir, file))
      .filter(existsSync)
      .map(Deno.realPathSync);
    fileResourceFiles.include.push(...resultFiles);
  }

  // apply removes and filter files dir
  const resourceFiles = fileResourceFiles.include.filter(
    (file: string) => {
      if (fileResourceFiles.exclude.includes(file)) {
        return false;
      } else if (
        supporting &&
        supporting.some((support) => file.startsWith(join(baseDir, support)))
      ) {
        return false;
      } else {
        return true;
      }
    },
  );
  return resourceFiles;
}
