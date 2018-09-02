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

async function nativeConcatMapReduce(source) {
  let accumulator = 0;
  for await (const outer of source) {
    for await (const inner of from(outer)) {
      accumulator = accumulator + inner;
    }
  }
}

const array100x100 = new Array(100).fill(Array.from(Array(100).keys()));
const array1000 = Array.from(Array(1000).keys());

window.array100x100 = array100x100;
window.array1000 = array1000;
window.sum = nativeSum;
window.from = from;
window.concatMapReduce = nativeConcatMapReduce;

// test1

nativeSum(from(array1000)).then(() => deferred.resolve());

// test2

nativeConcatMapReduce(from(array100x100)).then(() => deferred.resolve());
