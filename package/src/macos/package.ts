import { dirname, join } from "https://deno.land/std/path/mod.ts";
import { existsSync } from "https://deno.land/std/fs/exists.ts";
import { Configuration } from "../common/config.ts";
import { Logger } from "../common/logger.ts";
import { ensureDirExists } from "../common/utils.ts";

export async function makePackage(configuration: Configuration, log: Logger) {
  // Target package
  const outPackage = join(
    configuration.dirs.out.abs,
    configuration.pkgInfo.name,
  );

  log.info(`Packaging into ${outPackage}`);

  // Clean any existing package
  if (existsSync(outPackage)) {
    Deno.removeSync(outPackage);
  }

  // Make the out dir
  ensureDirExists(dirname(outPackage));

  // Run pkg build
  const pkgCmd: string[] = [];
  pkgCmd.push("pkgbuild");
  pkgCmd.push("--root");
  pkgCmd.push(configuration.dirs.dist.abs);
  pkgCmd.push("--identifier");
  pkgCmd.push(configuration.pkgInfo.identifier);
  pkgCmd.push("--version");
  pkgCmd.push(configuration.version);
  pkgCmd.push(...configuration.pkgInfo.packageArgs());
  pkgCmd.push("--ownership");
  pkgCmd.push("recommended");
  pkgCmd.push(outPackage);

  log.info(pkgCmd);
  const p = Deno.run({
    cmd: pkgCmd,
  });
  const status = await p.status();
  if (status.code !== 0) {
    throw Error("Failure to build macos package");
  }
}

function signPackage(configuration: Configuration, log: Logger) {
}

function signBinaries(configuration: Configuration, log: Logger) {
}
