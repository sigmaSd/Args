import Arguments from "./src/args.ts";
import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.126.0/testing/asserts.ts";

Deno.test("singleShortContains", () => {
  const args = new Arguments(["-V"]);
  assert(args.contains("-V"));
});
Deno.test("singleLongContains", () => {
  const args = new Arguments(["--version"]);
  assert(args.contains("--version"));
});
Deno.test("containsTwo01", () => {
  const args = new Arguments(["--version"]);
  assert(args.contains(["-v", "--version"]));
});
Deno.test("containsTwo02", () => {
  const args = new Arguments(["-v"]);
  assert(args.contains(["-v", "--version"]));
});
Deno.test("containsTwo03", () => {
  const args = new Arguments(["-v", "--version"]);
  assert(args.contains(["-v", "--version"]));
});
Deno.test("invalidFlag01", () => {
  const args = new Arguments(["-v", "--version"]);
  assertThrows(() => args.contains("v"));
});
Deno.test("invalidFlag02", () => {
  const args = new Arguments(["-v", "--version"]);
  assertThrows(() => args.contains(["v", "--version"]));
});
Deno.test("invalidFlag03", () => {
  const args = new Arguments(["-v", "--version"]);
  assertThrows(() => args.contains(["-v", "-version"]));
});
Deno.test("invalidFlag04", () => {
  const args = new Arguments(["-v", "--version"]);
  assertThrows(() => args.contains(["-v", "version"]));
});
Deno.test("option01", () => {
  const args = new Arguments(["-w", "10"]);
  const value = args.optValueFromFn("-w", (v) => parseInt(v));
  assertEquals(value, 10);
});
Deno.test("option02", () => {
  const args = new Arguments(["--width", "10"]);
  const value = args.optValueFromFn("--width", (v) => parseInt(v));
  assertEquals(value, 10);
});
Deno.test("option03", () => {
  const args = new Arguments(["--name", "test"]);
  const value = args.optValueFromFn("--name", (v) => v);
  assertEquals(value, "test");
});
Deno.test("longFlagWithCharacterFromShortFlag", () => {
  const args = new Arguments(["--version"]);
  assert(!args.contains("-s"));
  assert(args.contains("--version"));
});
Deno.test("duplicatedOption01", () => {
  const args = new Arguments(["--name", "test1", "--name", "test2"]);
  const value1 = args.optValueFromFn("--name", (v) => v);
  const value2 = args.optValueFromFn("--name", (v) => v);
  assertEquals(value1, "test1");
  assertEquals(value2, "test2");
});
Deno.test("optionFromOsStr", () => {
  const args = new Arguments(["--input", "test.txt"]);
  const value = args.optValueFromFn("--input", (v) => v);
  assertEquals(value, "test.txt");
});
Deno.test("missingOptionValue01", () => {
  const args = new Arguments(["--value"]);
  const value = args.optValueFromFn("--value", (v) => parseInt(v));
  assertEquals(value, undefined);
  assertEquals(args.finish(), ["--value"]);
});
Deno.test("missingOptionValue02", () => {
  const args = new Arguments(["--value", "q"]);
  const value = args.optValueFromFn("--value", (v) => parseInt(v));
  assertEquals(value, undefined);
  assertEquals(args.finish(), ["--value", "q"]);
});
Deno.test("multipleOption01", () => {
  const args = new Arguments(["-w", "10", "-w", "20"]);
  const value = args.valuesFromFn("-w", (v) => parseInt(v));
  assertEquals(value, [10, 20]);
});
Deno.test("multipleOption02", () => {
  const args = new Arguments([]);
  const value = args.valuesFromFn("-w", (v) => parseInt(v));
  assertEquals(value, []);
});
Deno.test("multipleOption03", () => {
  const args = new Arguments(["-w", "10", "--other", "-w", "20"]);
  const value = args.valuesFromFn("-w", (v) => parseInt(v));
  assertEquals(value, [10, 20]);
});
Deno.test("freeFromStr01", () => {
  const args = new Arguments(["5"]);
  assertEquals(args.optFreeFromFn((v) => parseInt(v)), 5);
});
Deno.test("freeFromFn02", () => {
  const args = new Arguments([]);
  assertEquals(args.optFreeFromFn((v) => parseInt(v)), undefined);
});
Deno.test("freeFromFn03", () => {
  const args = new Arguments(["-h"]);
  assertThrows(
    () =>
      args.optFreeFromFn((v) => {
        const n = parseInt(v);
        isNaN(n) ? undefined : n;
      }),
    Error,
    "failed to parse '-h'",
  );
});
Deno.test("freeFromFn04", () => {
  const args = new Arguments(["a"]);
  assertThrows(
    () =>
      args.optFreeFromFn((v) => {
        const n = parseInt(v);
        isNaN(n) ? undefined : n;
      }),
    Error,
    "failed to parse 'a'",
  );
});
Deno.test("optFreeFromFn05", () => {
  const args = new Arguments(["-5"]);
  assertEquals(args.optFreeFromFn((v) => parseInt(v)), -5);
});
Deno.test("optFreeFromFn06", () => {
  const args = new Arguments(["-3.14"]);
  assertEquals(args.optFreeFromFn((v) => parseFloat(v)), -3.14);
});
Deno.test("requiredOption01", () => {
  const args = new Arguments(["--width", "10"]);
  const value = args.valueFromFn("--width", (v) => v);
  assertEquals(value, "10");
});
Deno.test("missingRequiredOption01", () => {
  const args = new Arguments([]);
  assertThrows(
    () => {
      args.valueFromFn("-w", (v) => parseFloat(v));
    },
    Error,
    "missing required option '-w'",
  );
});
Deno.test("missingRequiredOption02", () => {
  const args = new Arguments([]);
  assertThrows(
    () => {
      args.valueFromFn("--width", (v) => parseFloat(v));
    },
    Error,
    "missing required option '--width'",
  );
});
Deno.test("subcommand", () => {
  const args = new Arguments(["toolchain", "install", "--help"]);

  {
    const cmd = args.subcommand();
    assertEquals(cmd, "toolchain");
  }
  {
    const cmd = args.subcommand();
    assertEquals(cmd, "install");
  }
  {
    const cmd = args.subcommand();
    assertEquals(cmd, undefined);
  }
});
