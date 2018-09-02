async function* range(start, end) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}
exports.range = range;
async function reduce(reducer, initial, source) {
  let accumulator = initial;
  for await (const item of source) {
    accumulator = reducer(accumulator, item);
  }
  return accumulator;
}
exports.reduce = reduce;
function run(numberOfItems) {
  return reduce((accumulator, next) => accumulator + next, 0, range(0, numberOfItems));
}
exports.run = run;