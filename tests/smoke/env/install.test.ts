/*
* install-tools.test.ts
*
* Copyright (C) 2020 by RStudio, PBC
*
*/
import { testQuartoCmd } from "../../test.ts";
import { noErrorsOrWarnings, printsMessage } from "../../verify.ts";

testQuartoCmd(
  "tools",
  ["list"],
  [
    noErrorsOrWarnings,
    printsMessage("INFO", /^tinytex\s+/),
  ],
);
