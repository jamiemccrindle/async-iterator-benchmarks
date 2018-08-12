import { config } from "rxjs";
config.useDeprecatedSynchronousErrorHandling = true;

import Benchmark from "benchmark";
import * as Rx from "rxjs";
import { SchedulerLike } from "rxjs";
import { logComplete, logResults, logStart } from "../utils";
import { concatMapReduce } from "./concatMapReduce";
import { mapFilterReduce } from "./mapFilterReduce";
import { reduce } from "./reduce";

export interface ITests {
  rxTest: (scheduler: SchedulerLike | null, deferred: any) => any;
  nativeTest: (deferred: any) => any;
  mostTest: (deferred: any) => any;
}

export function runSuite(name: string, tests: ITests) {
  return new Promise((resolve, reject) => {
    const suite = new Benchmark.Suite(name, {
      onError: (error: any) => {
        console.log(error);
        reject(error);
      }
    });
    return (
      suite
        .add("RxJs null scheduler", {
          defer: true,
          fn: (deferred: any) => {
            tests.rxTest(null, deferred);
          }
        })
        .add("RxJs queuedScheduler", {
          defer: true,
          fn: (deferred: any) => {
            tests.rxTest(Rx.queueScheduler, deferred);
          }
        })
        .add("RxJs asyncScheduler", {
          defer: true,
          fn: (deferred: any) => {
            tests.rxTest(Rx.asyncScheduler, deferred);
          }
        })
        .add("RxJs asapScheduler", {
          defer: true,
          fn: (deferred: any) => {
            tests.rxTest(Rx.asapScheduler, deferred);
          }
        })
        .add("Most", {
          defer: true,
          fn: (deferred: any) => tests.mostTest(deferred)
        })
        .add("Native", {
          defer: true,
          fn: (deferred: any) => tests.nativeTest(deferred)
        })
        // add listeners
        .on("start", () => {
          logStart(name);
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

export async function vs() {
  await runSuite("reduce", reduce(1000));
  await runSuite("concatMapReduce", concatMapReduce(100));
  await runSuite("mapFilterReduce", mapFilterReduce(1000));
}

// import * as Rx from "rxjs";
// import * as RxOperators from "rxjs/operators";

// function sample() {
//   return new Promise((resolve, reject) => {
//     Rx.from([1, 2, 3])
//       .pipe(
//         RxOperators.filter(x => x % 2 === 0),
//         RxOperators.map(x => x + x),
//         RxOperators.reduce((a, n) => a + n, 0)
//       )
//       .subscribe({
//         complete() {
//           resolve();
//         }
//       });
//   });
// }

// async function run() {
//   for (let i = 0; i < 1000000; i++) {
//     await sample();
//   }
// }

// run().then(() => {
//   console.log("done");
// });
