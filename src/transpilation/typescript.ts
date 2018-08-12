export async function* range(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}

export async function reduce<TAccumulator, TNext>(
  reducer: (accumulator: TAccumulator, next: TNext) => TAccumulator,
  initial: TAccumulator,
  source: AsyncIterableIterator<TNext>
) {
  let accumulator = initial;
  for await (const item of source) {
    accumulator = reducer(accumulator, item);
  }
  return accumulator;
}

export function run(numberOfItems: number) {
  return reduce((accumulator, next) => accumulator + next, 0, range(0, numberOfItems));
}
