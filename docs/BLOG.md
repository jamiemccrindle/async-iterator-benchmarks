# Introduction to Async Iteration

Async Iterators make it easier to write code to manage asynchronous streams of data in a familiar way. The simplest way to create an async iterator is to use `async function*` e.g.:

```javascript
async function* range(start, end) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}
```

The easiest way to go through an async iterator is with the new `for await` syntax e.g.:

```javascript
for await(const item of range(1, 10)) {
  console.log(item);
}
```

The range function above could have been written using a regular generator. What the async keyword lets us do is use the await keyword inside the function as illustrated by the example below.

Say you wanted to have your code notify you if the pound (GBP) ever reached parity with the dollar (USD). We could use exchangratesapi.io to get the latest rate. To avoid overloading their servers, we only want to call their API once a day.

```javascript
// get the GBP / USD rate once a day
async function* liveRates() {
  while(true) {
    const response =
      await fetch('https://exchangeratesapi.io/api/latest?base=GBP');
    const json = await response.json();
    yield json.rates.USD;
    // pause for a day
    await delay(24 * 60 * 60 * 1000);
  }
}

// go through the prices as they come in
for await(const price of liveRates()) {
  if(price <= 1) {
    console.log('yikes');
    break;
  }
}

// a function that pauses for a set amount of time
function delay(timeout) { return new Promise(resolve => setTimeout(resolve, timeout)); }
```

## Async Iteration

`async function*` is an async generator. The mechanism they use internally is the `AsyncIterator` interface. The following code is how the range function would be written as an `AsyncIterator` instead:

```javascript
function range(start, end) {
  let i = start;
  return {
    // async iterables have a method called [Symbol.asyncIterator]
    [Symbol.asyncIterator]() {
      return {
        // [Symbol.asyncIterator] must return an object with a next method
        next() {
          if (i < end) {
            // return a value and done: false if we're not done
            return Promise.resolve({ value: i++, done: false });
          }
          // return done: true if we're done
          return Promise.resolve({ done: true });
        }
      };
    }
  };
}
```

As long as a JavaScript object has the following properties it can be used as an `AsyncIterator`:

- A method called: `[Symbol.asyncIterator]()`
- `[Symbol.asyncIterator]()` returns an object with a `next()` method
- next() returns a `Promise`
- If this is the last value, the `Promise` should resolve to `{ done: true }`
- Otherwise it should resolve to `{ value: value, done: false }` where value is the next value

This is somewhat more complicated than the `async function*` syntax but can be used to solve problems that `async function*` can't. For example, it is useful for turning a stream of events into an async iterable.

## Turning a stream of events into an async iterable

Async iterators make it possible to turn code that requires callbacks to one that has control flow that's easier to follow e.g.

Instead of this syntax:

```javascript
lineReader.on("line", line => {
  console.log(line);
});
lineReader.on("close", () => {
  console.log("done");
});
```

We could use this instead:

```javascript
for await (const line of lines) {
    console.log(line);
}
console.log('done');
```

It turns out that doing this generically is somewhat complicated because:

- lineReader could send lines before the `for await` consumes them
- lineReader may need to pause sending lines so that we don't run out of memory
- `for await` could run before there are any lines available
- the async iterator next method could be called directly multiple times without waiting for new lines

While the implementation is too complex for this blog, the interface for a generic mechanism isn't. Borrowing the concept of a Subject from RxJs, we could imagine having a class that does the following:

```javascript
function fromLineReader(lineReader) {
  const subject = new Subject();
  // send a line to the subject
  lineReader.on('line' => subject.onNext(line));
  // close the subject when the line reader closes
  lineReader.on('close' => subject.onCompleted());
  // close the line reader when the subject closes
  subject.finally(() => lineReader.close());
  return subject.iterable;
}
```

## Async Iterators vs RxJs

Reactive Extensions for JavaScript or RxJS is another way to manage asynchronous streams. A significant difference between the two is in how control flows when using them. For example this is the control flow around an async iterable `for await`:

```javascript
const source = // some async iterator
console.log('starting');
try {
  for await (const item of source) {
    console.log('in the loop');
  }
  console.log('succeeded');
} catch(error) {
  console.log('error');
} finally {
  console.log('done');
}
console.log('on to the next thing');
```

And this is the equivalent control flow using RxJS

```javascript
const source = console.log("starting"); // some observable
const subscribe = source
  .pipe(
    finalize(() => {
      console.log("done");
      console.log("on to the next thing");
    })
  )
  .subscribe(
    item => console.log("in the loop"),
    error => console.log("error"),
    () => console.log("succeeded")
  );
```

The other significant difference is in how they perform.

## Performance vs RxJs

We compared the performance of async iterators to RxJs. As with all benchmarks, these should only be considered directional.

Async iterators are still relatively new and performance will vary across javascript engine, operating system, hardware and the problem you're trying to solve.

We used the benchmark.js library in all of these benchmarks.

Note:
the implementations are not exactly equivalent but match how
these problems would be idiomatically solved using each framework.

In all of these benchmarks, the Rx default scheduler was used.

| Property         | Value                 |
| ---------------- | --------------------- |
| Node             | 10.9.0                |
| Hardware         | 2.7 GHz Intel Core i7 |
| Operating System | Mac OS X              |

### reduce

In this benchmark we implemented sum as a reduce over 1000 numbers.

#### native

```javascript
async function sum(source) {
  let accumulator = 0;
  for await (const item of source) {
    accumulator += item * 2;
  }
  return accumulator;
}
await sum(source);
```

#### RxJs

```javascript
Rx.from(source, scheduler)
  .pipe(RxOperators.reduce((a, n) => a + n, 0))
  .subscribe(/* do something with the result */);
```

#### results

| Implementation |         Ops Per Second\* |
| -------------- | -----------------------: |
| **RxJs**       | **15,912.45** per second |
| AsyncIterators |      1,815.12 per second |

\* higher is better

### map filter reduce

In this case we combine a map, filter and a reduce over 1000 numbers.

#### native

```javascript
async function mapFilterReduce(source) {
  let accumulator = 0;
  for await (const x of Native.from(array)) {
    if (x % 2 === 0) {
      accumulator = accumulator + (x + x);
    }
  }
}
await mapFilterReduce(source);
```

#### RxJs

```javascript
Rx.from(array, scheduler)
  .pipe(
    RxOperators.filter(x => x % 2 === 0),
    RxOperators.map(x => x + x),
    RxOperators.reduce((a, n) => a + n, 0)
  )
  .subscribe(/* do something with the result */);
```

#### results

| Implementation |         Ops Per Second\* |
| -------------- | -----------------------: |
| **RxJs**       | **10,599.15** per second |
| AsyncIterators |      1,781.83 per second |

\* higher is better

### concat map reduce

In this case the source is an array of arrays of numbers that
is 100x100.

#### native

```javascript
async function* from(array) {
  for await (const item of array) yield item;
}
async function concatMapReduce(source) {
  let accumulator = 0;
  for await (const outer of source) {
    for await (const inner of from(outer)) {
      accumulator = accumulator + inner;
    }
  }
}
await concatMapReduce(source);
```

#### RxJs

```javascript
Rx.from(array, scheduler)
  .pipe(
    RxOperators.concatMap(value => Rx.from(value)),
    RxOperators.reduce((a, n) => a + n, 0)
  )
  .subscribe(/* do something with the result */);
```

#### results

| Implementation |        Ops Per Second\* |
| -------------- | ----------------------: |
| **RxJs**       | **2,889.56** per second |
| AsyncIterators |       182.97 per second |

\* higher is better

### vs Most

We compared async iterators to RxJS because it's likely that folk will be choosing between these two ways of solving problems involving async streams given RxJS's popularity and that async iterators are now part of ECMAScript.

If you're very performance sensitive, you may consider other libraries e.g. `most`, depending on the problem you're solving:

| Variation       | Implementation |         Ops Per Second\* |
| --------------- | -------------- | -----------------------: |
| reduce          | RxJs           |     15,912.45 per second |
| reduce          | AsyncIterators |      1,815.12 per second |
| reduce          | **Most**       | **66,560.13** per second |
| mapFilterReduce | RxJs           |     10,599.15 per second |
| mapFilterReduce | AsyncIterators |      1,781.83 per second |
| mapFilterReduce | **Most**       | **34,252.84** per second |
| concatMapReduce | **RxJs**       |  **2,889.56** per second |
| concatMapReduce | AsyncIterators |        182.97 per second |
| concatMapReduce | Most           |      2,318.10 per second |

\* higher is better

## Native vs Transpiled

It's likely that you'll want to transpile your async iterators to support all browsers.

| Browser | Supported |
| ------- | --------- |
| IE 11   | No        |
| Edge    | No        |
| Firefox | Yes       |
| Chrome  | Yes       |
| Safari  | Yes       |

We tested the performance of the `reduce` implementation above
using Babel and TypeScript to transpile the code.

| Variation | Implementation |     Ops Per Second\* |
| --------- | -------------- | -------------------: |
| reduce    | TypeScript     |  9,218.42 per second |
| reduce    | Babel          | 14,445.59 per second |
| reduce    | Native         | 17,691.37 per second |

Interestingly Typescript transpilation results in a 50% slowdown while Babel is quite close to native performance. Babel requires the inclusion of the `regenerator-runtime` from Facebook.

## Cancellation and avoiding leaks

Neither promises nor async iterators have a way to cancel them. There is a TC39 proposal for cancellation of asynchronous operations but it is still at stage 1.

In the example below, we create an async iterable that gets stuck waiting for an
upstream async iterable that never ends. Even though we call `return()` on it,
there is no way for the `neverEnds()` to get cancelled and as a result, the `finally`
block is never called.

```javascript
async function* asyncIterable() {
  try {
    // never ends is a async iterator that never
    // produces a value or ends
    for await (const item of neverEnds()) {
      yield item;
    }
  } finally {
    // never called
    console.log("clean up resources");
  }
}

const iter = asyncIterable();
await iter.return();
```

## In the wild

graphqljs
readable streams

In the tests we did, async iterators performed relatively poorly vs the default RxJs scheduler.

Async Iteration was included in the ECMAScript standard in January 2018.

NodeJS very much encouraged asynchronous programming right from the start

In January 2018 the TC39 committee release the aptly named ECMAScript 2018.

Cancellation and avoiding leaks
Subject
Vs RxJS
Performance
Transpilation
Vs Rx
https://docs.google.com/presentation/d/1r2V1sLG8JSSk8txiLh4wfTkom-BoOsk52FgPBy8o3RM/edit?usp=sharing