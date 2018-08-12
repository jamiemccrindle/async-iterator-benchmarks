// tslint:disable-next-line:no-var-requires
require("babel-polyfill");

import Benchmark from "benchmark";
// tslint:disable-next-line:no-var-requires
const { run: jsrun } = require("../../transpiled/babel");
// tslint:disable-next-line:no-var-requires
const { run: tsrun } = require("../../transpiled/typescript");
import { logComplete, logResults, logStart } from "../utils";
import { run } from "./typescript";

export function runSuite(numberOfItems: number) {
  return new Promise((resolve, reject) => {
    const suite = new Benchmark.Suite("transpilation", {
      onError: (error: any) => {
        console.log(error);
        reject(error);
      }
    });
    return (
      suite
        .add("Typescript", {
          defer: true,
          fn: (deferred: any) => {
            tsrun(numberOfItems).then(() => deferred.resolve());
          }
        })
        .add("Babel", {
          defer: true,
          fn: (deferred: any) => {
            jsrun(numberOfItems).then(() => deferred.resolve());
          }
        })
        .add("Native", {
          defer: true,
          fn: (deferred: any) => {
            run(numberOfItems).then(() => deferred.resolve());
          }
        })
        // add listeners
        .on("start", () => {
          logStart("transpilation");
        })
        .on("cycle", (event: any) => {
          logResults(event);
        })
        .on("complete", () => {
          logComplete();
          resolve();
        })
        .run({
          async: false,
          queued: true
        })
    );
  });
}

export async function transpilation() {
  await runSuite(100);
}
