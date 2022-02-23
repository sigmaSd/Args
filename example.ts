import Arguments from "./src/args.ts";

let args = Arguments.fromEnv();

if (args.contains("-h") || args.contains("--help")) {
  console.log("help");
}

let app = {
  number: args.valueFromFn("--number", parseInt),
  optNumber: args.optValueFromFn("--opt-number", parseInt),
};

console.log(app);
console.log(args.finish());
