# Introduction

We're using React and TypeScript on the front-end in the Banking for Business team in Investec UK. We've been striving to keep our code as simple as possible which motivated our choice of MobX on the front-end over Redux. We do occasionally need to build functionality that needs to react to a stream of events and we've been discussing bringing RxJS into our stack.

In keeping with our aim to keep the code simple, we decided to see if Async Iterators could solve the same problems that RxJS would in way that is easier to reason about. This blog provides an overview of what Async Iterators are and how they compare to RxJS both in terms of usage and performance.

# Introduction to Async Iterators

Async Iterators make it easier to write code to create and consume asynchronous streams of data in a familiar imperative way. The simplest way to create an async iterator is to use `async function*`. In the `rangeWithDelay` example below we return the whole numbers between `start` and `end` with a delay of `waitForMilliseconds`

```javascript
async function* rangeWithDelay(start, end, waitForMilliseconds) {
  for (let i = start; i < end; i++) {
    yield i;
    await delay(waitForMilliseconds);
  }
}
```

You can go through the items return by an async iterator with `for await` e.g.:

```javascript
for await(const item of rangeWithDelay(1, 10, 1000)) {
  console.log(item);
}
```

One of the services we offer our customers is a notification when an exchange rate between two currencies hits a certain level. Say you wanted to write a simple version of this yourself where you have your code notify you if the pound (GBP) ever reached parity with the dollar (USD). We could use exchangratesapi.io to get the latest rate. To avoid overloading their servers, we only want to call their API once a day.

```javascript
// get the GBP / USD rate once a day
async function* liveRates() {
  while(true) {
    // fetch the rates
    const response =
      await fetch('https://api.exchangeratesapi.io/latest?base=GBP');
    // parse the json body
    const json = await response.json();
    // return the current GBPUSD exchange rate
    yield json.rates.USD;
    // pause for a day
    await delay(24 * 60 * 60 * 1000);
  }
}

// go through the prices as they come in
for await(const price of liveRates()) {
  // insert brexit joke here
  if(price <= 1) {
    console.log('yikes');
    break;
  }
}

// a function that pauses for a set amount of time
function delay(timeout) { 
  return new Promise(resolve => setTimeout(resolve, timeout)); 
}
```

## Async Iteration

`async function*` is an async generator. The mechanism they use internally is the `AsyncIterator` interface. Here is how we could write the interval method from RxJS using `AsyncIterator`:

```javascript
function interval(milliseconds) {
  let running = true;
  let i = 0;
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next(value) {
      return running
        ? delay(milliseconds)
            .then(() => ({ value: i++, done: false }))
        : Promise.resolve({ done: true });
    },
    throw(error) {
      running = false;
      return Promise.resolve({ done: true });
    },
    return(value) {
      running = false;
      return Promise.resolve({ done: true });
    }
  };
}
```

As long as a JavaScript object has the following properties it can be used as an `AsyncIterator`:

- A method called: `[Symbol.asyncIterator]()`
- `[Symbol.asyncIterator]()` returns an object with a `next()` method
- next() returns a `Promise`
- If this is the last value, the `Promise` should resolve to `{ done: true }`
- Otherwise it should resolve to `{ value: value, done: false }` where `value` is the next value

This is somewhat more complicated than the `async function*` syntax but can be used to solve problems that `async function*` can't. For example, it is useful for turning a stream of events into an async iterable.

## Turning a stream of events into an async iterable

Async iterators make it possible to turn code that requires callbacks to one that has control flow that's easier to follow. At Investec, we often have to take streams of data from various input sources, tranform it and send it on to various output sources. The standard mechanism to support reading streams of data is event based, for example to read lines from a file the event based syntax looks something like this:

```javascript
lineReader.on("line", line => {
  console.log(line);
});
lineReader.on("close", () => {
  console.log("done");
});
```

Instead, it's easier to reason about code that is more imperative e.g. using async iterators we could imagine having code like this instead:

```javascript
for await (const line of fromLineReader(lineReader)) {
    console.log(line);
}
console.log('done');
```

It turns out that doing this generically is somewhat complicated because:

- lineReader could send lines before the `for await` consumes them
- lineReader may need to pause sending lines so that we don't run out of memory
- `for await` could run before there are any lines available
- the async iterator `next` method could be called directly multiple times without waiting for new lines

The [Axax](https://github.com/jamiemccrindle/axax) library has an implementation of `Subject` for async iterators which borrows the concept of a `Subject` from RxJS.  It opens up the possibility of writing something like this:

```javascript
function fromLineReader(lineReader) {
  const subject = new Subject();

  // send a line to the subject
  lineReader.on('line' => subject.onNext(line));

  // close the subject when the line reader closes
  lineReader.on('close' => subject.onCompleted());

  // close the line reader when the subject closes
  subject.finally(() => lineReader.close());

  // return the async iterator
  return subject.iterable;
}
```

Note: this does not handle backpressure i.e. if the lineReader is 
producing lines faster than the async iterator is being consumed, this
process could run out of memory.

## Cancellation and avoiding leaks

Neither Promises nor async iterators have a reliable way to cancel them. There is a [TC39 proposal for cancellation of asynchronous operations](https://github.com/tc39/proposal-cancellation) but it is still at stage 1.

In the example below, we create an async iterable that gets stuck waiting for an
upstream async iterable that never ends. Even though we call `return()` on it,
there is no way for the `neverEnds()` to get cancelled and as a result the `finally`
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

## Async Iterators vs RxJS

Reactive Extensions for JavaScript or RxJS is another way to manage asynchronous streams. A significant difference between the two is in how control flows when using them. For example this is the control flow around an async iterable `for await`:

```javascript
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

While the `for await` syntax is new, the rest of the control flow behaves
as you'd expect, especially for the try / catch / finally blocks.

And this is the equivalent control flow using RxJS

```javascript
console.log("starting");
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

While this will be familiar to RxJS developers it may be harder for developers
unfamiliar with the library to reason about.

The other significant difference is in how they perform.

## Performance vs RxJS

We compared the performance of async iterators to RxJS. As with all benchmarks, these should only be considered directional. Async iterators are still relatively new and performance will vary across javascript engine, operating system, hardware and the problem you're trying to solve.

We used the benchmark.js library in all of these benchmarks.

Note:
the implementations are not exactly equivalent but match how
these problems would be idiomatically solved using each framework.

| Property         | Value                 |
| ---------------- | --------------------- |
| Node             | 10.9.0                |
| Hardware         | 2.7 GHz Intel Core i7 |
| Operating System | Mac OS X              |

### RxJS Schedulers

| Scheduler                 | Purpose                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `null`                    | By not passing any scheduler, notifications are delivered synchronously and recursively. Use this for constant-time operations or tail recursive operations.                   |
| `queueScheduler`          | Schedules on a queue in the current event frame (trampoline scheduler). Use this for iteration operations.                                                                     |
| `asapScheduler`           | Schedules on the micro task queue, which is the same queue used for promises. Basically after the current job, but before the next job. Use this for asynchronous conversions. |
| `asyncScheduler`          | Schedules work with `setInterval`. Use this for time-based operations.                                                                                                         |
| `animationFrameScheduler` | Schedules task that will happen just before next browser content repaint. Can be used to create smooth browser animations.                                                     |

### reduce

In this benchmark we implemented sum as a reduce over 1000 numbers.

#### native

```javascript
async function sum(source) {
  let accumulator = 0;
  for await (const item of source) {
    accumulator += item;
  }
  return accumulator;
}
await sum(source);
```

#### RxJS

```javascript
Rx.from(source)
  .pipe(RxOperators.reduce((a, n) => a + n, 0))
  .subscribe(/* do something with the result */);
```

#### results

| Implementation   |         Ops Per Second\* |
| ---------------- | -----------------------: |
| **RxJS default** | **15,912.45** per second |
| RxJS queued      |      5,353.40 per second |
| RxJS asap        |      1,022.07 per second |
| AsyncIterators   |      1,815.12 per second |

\* higher is better

### map filter reduce

In this case we combine a map, filter and a reduce over 1000 numbers.

#### native

```javascript
async function mapFilterReduce(source) {
  let accumulator = 0;
  for await (const x of Native.from(array)) {
    if (x % 2 === 0) {
      accumulator = accumulator + x * 2;
    }
  }
}
await mapFilterReduce(source);
```

#### RxJS

```javascript
Rx.from(array, scheduler)
  .pipe(
    RxOperators.filter(x => x % 2 === 0),
    RxOperators.map(x => x * 2),
    RxOperators.reduce((a, n) => a + n, 0)
  )
  .subscribe(/* do something with the result */);
```

#### results

| Implementation   |         Ops Per Second\* |
| ---------------- | -----------------------: |
| **RxJS default** | **10,599.15** per second |
| RxJS queued      |      2,711.63 per second |
| RxJS asap        |        801.94 per second |
| AsyncIterators   |      1,781.83 per second |

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

#### RxJS

```javascript
Rx.from(array, scheduler)
  .pipe(
    RxOperators.concatMap(value => Rx.from(value)),
    RxOperators.reduce((a, n) => a + n, 0)
  )
  .subscribe(/* do something with the result */);
```

#### results

| Implementation   |        Ops Per Second\* |
| ---------------- | ----------------------: |
| **RxJS default** | **2,889.56** per second |
| RxJS queued      |     1,845.89 per second |
| RxJS asap        |     1,242.96 per second |
| AsyncIterators   |       182.97 per second |

\* higher is better

### vs Most

We compared async iterators to RxJS because it's likely that folk will be choosing between these two ways of solving problems involving async streams given RxJS's popularity and that async iterators are now part of ECMAScript.

If you're very performance sensitive, you may consider other libraries e.g. `most` but it will depend on the problem you're solving. Here are the same benchmarks including `most`.

| Variation       | Implementation |         Ops Per Second\* |
| --------------- | -------------- | -----------------------: |
| reduce          | RxJS           |     15,912.45 per second |
| reduce          | AsyncIterators |      1,815.12 per second |
| reduce          | **Most**       | **66,560.13** per second |
| mapFilterReduce | RxJS           |     10,599.15 per second |
| mapFilterReduce | AsyncIterators |      1,781.83 per second |
| mapFilterReduce | **Most**       | **34,252.84** per second |
| concatMapReduce | **RxJS**       |  **2,889.56** per second |
| concatMapReduce | AsyncIterators |        182.97 per second |
| concatMapReduce | Most           |      2,318.10 per second |

\* higher is better

## Native vs Transpiled

It's likely that you'll want to transpile your async iterators to support all browsers.

| Browser   | Supported |
| --------- | --------- |
| IE 11     | No        |
| Edge      | No        |
| Firefox   | Yes       |
| Chrome    | Yes       |
| Safari 12 | Yes       |

We tested the performance of the `reduce` implementation above
using Babel and TypeScript to transpile the code.

| Variation | Implementation   |     Ops Per Second\* |
| --------- | ---------------- | -------------------: |
| reduce    | TypeScript 3.0.2 |  8,967.30 per second |
| reduce    | Babel 6.26.0     | 15,101.20 per second |
| reduce    | Native           | 19,129.27 per second |

Interestingly Typescript transpilation results in a 50% slowdown while Babel is quite close to native performance. Babel requires the inclusion of the `regenerator-runtime` from Facebook.

## So did we end up using Async Iterators

Yes! We have used them to build our internal dashboard application. It's built using React, TypeScript, Koa, SocketIO and Immer. Monitors run on the server and publish metric deltas to client browsers to update their status but this is perhaps a topic for another blog entry. It turns out that Async Generators are a great way to write our monitors in a simple readable way.

## tl;dr

Based on our investigation, we have decided to use async iterators when our performance is not CPU bound as they are a good way to keep our code simpler.
