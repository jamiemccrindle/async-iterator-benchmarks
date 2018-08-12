import * as Most from "most";
import * as Rx from "rxjs";
import { SchedulerLike } from "rxjs";
import * as RxOperators from "rxjs/operators";
import { ITests } from ".";
import * as Native from "../operators";
import { deferredObserver } from "../utils";

export const concatMapReduce = (numberOfItems: number) => {
  const array = new Array<number[]>(numberOfItems).fill(
    Array.from(Array(numberOfItems).keys())
  );

  function rxTest(scheduler: SchedulerLike, deferred: any) {
    Rx.from(array, scheduler)
      .pipe(
        RxOperators.concatMap(value => Rx.from(value)),
        RxOperators.reduce((a, n) => a + n, 0)
      )
      .subscribe(deferredObserver(deferred));
  }

  function mostTest(deferred: any) {
    Most.from(array)
      .concatMap(value => Most.from(value))
      .reduce((a, n) => a + n, 0)
      .then(() => deferred.resolve());
  }

  async function nativeTest(deferred: any) {
    let accumulator = 0;
    for await (const outer of Native.from(array)) {
      for await (const inner of Native.from(outer)) {
        accumulator = accumulator + inner;
      }
    }
    deferred.resolve();
  }
  return {
    rxTest,
    nativeTest,
    mostTest
  } as ITests;
};
