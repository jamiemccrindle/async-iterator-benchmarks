// setup

async function* from(array) {
  for (const item of array) {
    yield item;
  }
}

async function nativeSum(source) {
  let accumulator = 0;
  for await (const x of source) {
    accumulator += x;
  }
  return accumulator;
}

const array1000 = Array.from(Array(1000).keys());

window.array1000 = array1000;
window.nativeSum = nativeSum;
window.from = from;

// test1

nativeSum(from(array1000)).then(() => deferred.resolve());

// test2

rxjs
  .from(array1000, rxjs.queuedScheduler)
  .pipe(rxjs.operators.reduce((a, n) => a + n, 0))
  .subscribe({
    complete: () => deferred.resolve(),
    error: error => console.log(error)
  });

  // test3

most.from(array1000)
  .reduce((a, n) => a + n, 0)
  .then(() => deferred.resolve());
