import * as Most from "most";
import * as Rx from "rxjs";
import { SchedulerLike } from "rxjs";
import * as RxOperators from "rxjs/operators";
import { ITests } from ".";
import * as Native from "../operators";
import { deferredObserver } from "../utils";

export const mapFilterReduce = (numberOfItems: number) => {
  const array = Array.from(Array(numberOfItems).keys());

  function rxTest(scheduler: SchedulerLike, deferred: any) {
    Rx.from(array, scheduler)
      .pipe(
        RxOperators.filter(x => x % 2 === 0),
        RxOperators.map(x => x + x),
        RxOperators.reduce((a, n) => a + n, 0)
      )
      .subscribe(deferredObserver(deferred));
  }

  function mostTest(deferred: any) {
    Most.from(array)
      .filter(x => x % 2 === 0)
      .map(x => x + x)
      .reduce((a, n) => a + n, 0)
      .then(() => deferred.resolve());
  }

  async function nativeTest(deferred: any) {
    async function nativeMapFilterReduce(source: any) {
      let accumulator = 0;
      for await (const x of Native.from(array)) {
        if (x % 2 === 0) {
          accumulator = accumulator + (x + x);
        }
      }
    }
    nativeMapFilterReduce(Native.from(array)).then(() => deferred.resolve());
  }
  return {
    rxTest,
    nativeTest,
    mostTest
  } as ITests;
};
