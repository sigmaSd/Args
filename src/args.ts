export default class Arguments {
  private args: string[];

  static fromEnv() {
    return new Arguments(Deno.args);
  }
  constructor(args: string[]) {
    this.args = args;
  }
  subcommand(): string | undefined {
    if (this.args.length === 0) {
      return undefined;
    }
    if (this.args[0].startsWith("-")) {
      return undefined;
    }
    return this.args.shift();
  }
  contains(keys: string | [string, string]): boolean {
    const maybeIdx = this.indexOf(intoKeys(keys))?.idx;
    if (maybeIdx !== undefined && maybeIdx != -1) {
      this.args.splice(maybeIdx, 1);
      return true;
    } else {
      return false;
    }
  }
  valueFromFn<T>(keys: string | [string, string], fn: (e: string) => T): T {
    const maybeVal = this.optValueFromFn(keys, fn);
    if (maybeVal) {
      return maybeVal;
    } else {
      throw Error(`missing required option '${intoKeys(keys)[0]}'`);
    }
  }
  valuesFromFn<T>(
    keys: string | [string, string],
    fn: (e: string) => T,
  ): T[] | undefined {
    const values = [];
    while (true) {
      const maybeVal = this.optValueFromFn(keys, fn);
      if (maybeVal) {
        values.push(maybeVal);
      } else {
        break;
      }
    }
    return values;
  }
  optValueFromFn<T>(
    keys: string | [string, string],
    fn: (e: string) => T | undefined,
  ): T | undefined {
    const val = this.findValue(intoKeys(keys));
    if (val) {
      const f = fn(val.value);
      if (f) {
        this.args.splice(val.idx, 1);
        if (val.kind === "TwoArguments") {
          this.args.splice(val.idx, 1);
        }
        return f;
      }
    }
  }
  findValue(
    keys: [string, string],
  ): { value: string; kind: "TwoArguments"; idx: number } | undefined {
    const maybeRes = this.indexOf(keys);
    if (maybeRes) {
      if (maybeRes.idx + 1 < this.args.length) {
        return {
          value: this.args[maybeRes.idx + 1],
          kind: "TwoArguments",
          idx: maybeRes.idx,
        };
      }
    }
  }
  indexOf(keys: [string, string]): { idx: number; key: string } | undefined {
    let res;
    keys.forEach((key) => {
      if (key.length !== 0) {
        const maybeIdx = this.args.findIndex((arg) => arg === key);
        if (maybeIdx !== -1) {
          res = { idx: maybeIdx, key: key };
        }
      }
    });
    return res;
  }
  freeFromFn<T>(f: (v: string) => T): T | undefined {
    return this.optFreeFromFn(f);
  }
  optFreeFromFn<T>(f: (v: string) => T | undefined): T | undefined {
    if (this.args.length === 0) {
      return undefined;
    }
    const value = this.args.shift()!;
    const fValue = f(value);
    if (fValue !== undefined) {
      return fValue;
    } else {
      throw new Error(`failed to parse '${value}'`);
    }
  }
  finish(): string[] {
    return this.args;
  }
}

function intoKeys(keys: string | [string, string]): [string, string] {
  let res: [string, string];
  if (typeof keys === "string") {
    res = [keys, keys];
  } else res = keys;
  if (!validKey(res[0])) {
    throw new Error(`Invalid flag: ${res[0]}`);
  }
  if (!validKey(res[1])) {
    throw new Error(`Invalid flag: ${res[1]}`);
  }

  return res;
}

function validKey(key: string) {
  const validShortFlag = (key: string) => {
    const chars = key.slice(1);
    return key.length == 2 || chars.split("").every((c) => c === chars[0]);
  };
  if (!key.startsWith("-")) {
    return false;
  }
  if (!key.startsWith("--")) {
    if (!validShortFlag(key)) {
      return false;
    }
  }
  return true;
}
