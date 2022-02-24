/*!
An ultra simple CLI arguments parser. Port of `https://github.com/RazrFalcon`
If you think that this library doesn't support some feature, it's probably intentional.
- No help generation.
- Only flags, options, free arguments and subcommands are supported.
- No combined flags (like `-vvv` or `-abc`).
- Options can be separated by a space, `=` or nothing. See build features.
- Arguments can be in any order.
- Non UTF-8 arguments are supported.
*/

export default class Arguments {
  private args: string[];

  /** Creates a parser from [`Deno.args`].
   */
  static fromEnv(): Arguments {
    return new Arguments([...Deno.args]);
  }
  /** Creates a parser from a vector of arguments.
  This can be used for supporting `--` arguments to forward to another program.
  **/
  constructor(args: string[]) {
    this.args = args;
  }
  /**  Parses the name of the subcommand, that is, the first positional argument.
    Returns `undefined` when subcommand starts with `-` or when there are no arguments left.
        **/
  subcommand(): string | undefined {
    if (this.args.length === 0) {
      return undefined;
    }
    if (this.args[0].startsWith("-")) {
      return undefined;
    }
    return this.args.shift();
  }
  /**
     Checks that arguments contain a specified flag.

     Searches through all arguments, not only the first/next one.

     Calling this method "consumes" the flag: if a flag is present `n`
     times then the first `n` calls to `contains` for that flag will
     return `true`, and subsequent calls will return `false`.
  **/
  contains(keys: string | [string, string]): boolean {
    const maybeIdx = this.indexOf(intoKeys(keys))?.idx;
    if (maybeIdx !== undefined && maybeIdx != -1) {
      this.args.splice(maybeIdx, 1);
      return true;
    } else {
      return false;
    }
  }
  /**
     Parses a key-value pair using a specified function.

     Searches through all argument, not only the first/next one.

     When a key-value pair is separated by a space, the algorithm
     will threat the next argument after the key as a value,
     even if it has a `-/--` prefix.
     So a key-value pair like `--key --value` is not an error.

     Must be used only once for each option.
   **/
  valueFromFn<T>(keys: string | [string, string], fn: (e: string) => T): T {
    const maybeVal = this.optValueFromFn(keys, fn);
    if (maybeVal) {
      return maybeVal;
    } else {
      throw Error(`missing required option '${intoKeys(keys)[0]}'`);
    }
  }
  /**
     Parses an optional key-value pair using a specified function.

     The same as `valueFromFn`, but returns `undefined` when option is not present.
   **/
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
  /**
     Parses multiple key-value pairs into the `Vec` using a specified function.

    This functions can be used to parse arguments like:<br>
    `--file /path1 --file /path2 --file /path3`<br>
    But not `--file /path1 /path2 /path3`.

    Arguments can also be separated: `--file /path1 --some-flag --file /path2`

    This method simply executes `optValueFromFn` multiple times.

    An empty `Vec` is not an error.
    **/
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
  /**
     Parses a free-standing argument using a specified function.

     Parses the first argument from the list of remaining arguments.
     Therefore, it's up to the caller to check if the argument is actually
     a free-standing one and not an unused flag/option.

     Sadly, there is no way to automatically check for flag/option.
     `-`, `--`, `-1`, `-0.5`, `--.txt` - all of this arguments can have different
     meaning depending on the caller requirements.

     Must be used only once for each argument.
  **/
  freeFromFn<T>(f: (v: string) => T): T | undefined {
    return this.optFreeFromFn(f);
  }

  /**
    Parses an optional free-standing argument using a specified function.

   The same as `freeFromFn`, but returns `undefined` when argument is not present.
  **/
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
  /**
   Returns a list of remaining arguments.

   It's up to the caller what to do with them.
   One can report an error about unused arguments,
   other can use them for further processing.
  **/
  finish(): string[] {
    return this.args;
  }

  // ----------
  // private functions
  // ----------

  private findValue(
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
  private indexOf(
    keys: [string, string],
  ): { idx: number; key: string } | undefined {
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
