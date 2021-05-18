/*
* book-extension.ts
*
* Copyright (C) 2020 by RStudio, PBC
*
*/

import { dirname, join } from "path/mod.ts";

import { Format } from "../../../config/format.ts";

import { RenderedFile } from "../../../command/render/render.ts";

import { kOutputFile } from "../../../config/constants.ts";

import { defaultWriterFormat } from "../../../format/formats.ts";

import {
  ProjectConfig,
  ProjectContext,
  projectOutputDir,
} from "../../project-context.ts";
import { inputTargetIndex } from "../../project-index.ts";
import { bookConfigRenderItems } from "./book-config.ts";
import { BookRenderItem } from "./book-config.ts";
import { isHtmlOutput } from "../../../config/format.ts";

export interface BookExtension {
  // bool extensions are single file by default but can elect to be multi file
  multiFile?: boolean;

  // book extensions can modify the format before render
  onSingleFilePreRender?: (format: Format, config?: ProjectConfig) => Format;

  // book extensions can post-process the final rendered file
  onSingleFilePostRender?: (
    project: ProjectContext,
    file: RenderedFile,
  ) => void;
}

export function isMultiFileBookFormat(format: Format) {
  const extension = format.extensions?.book as BookExtension;
  if (extension) {
    return extension.multiFile;
  } else {
    return false;
  }
}

export function onSingleFileBookPreRender(
  format: Format,
  config?: ProjectConfig,
): Format {
  const extension = format.extensions?.book as BookExtension;
  if (extension && extension.onSingleFilePreRender) {
    extension.onSingleFilePreRender(format, config);
  }
  return format;
}

export function onSingleFileBookPostRender(
  project: ProjectContext,
  file: RenderedFile,
) {
  const extension = file.format.extensions?.book as BookExtension;
  if (extension && extension.onSingleFilePostRender) {
    extension.onSingleFilePostRender(project, file);
  }
}

export async function bookMultiFileHtmlOutputs(
  context: ProjectContext,
): Promise<string[]> {
  // get all render targets for the book
  const renderFiles = bookConfigRenderItems(context.config).filter((
    item: BookRenderItem,
  ) => !!item.file);

  // if there are no render files then return empty
  if (renderFiles.length === 0) {
    return [];
  }

  // find the name of the multi-file html format
  const index = await inputTargetIndex(context, renderFiles[0].file!);
  if (!index) {
    return [];
  }

  const formatName = Object.keys(index.formats).find((name) => {
    if (isMultiFileBookFormat(defaultWriterFormat(name))) {
      const format = index.formats[name];
      return isHtmlOutput(format.pandoc, true) && !!format.pandoc[kOutputFile];
    } else {
      return false;
    }
  });
  if (!formatName) {
    return [];
  }

  // find all of the output files for this format
  const outputFiles: string[] = [];
  for (let i = 0; i < renderFiles.length; i++) {
    const file = renderFiles[i].file!;
    const index = await inputTargetIndex(context, file);
    const outputFile = index?.formats[formatName].pandoc[kOutputFile];
    if (outputFile) {
      outputFiles.push(
        join(projectOutputDir(context), dirname(file), outputFile),
      );
    }
  }

  return outputFiles;
}
