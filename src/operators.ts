export async function* from<T>(array: T[]) {
  for (const item of array) {
    yield item;
  }
}

export async function* range(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i;
  }
}

export async function* map<TIn, TOut>(
  mapper: (t: TIn) => TOut,
  source: AsyncIterableIterator<TIn>
) {
  for await (const item of source) {
    yield mapper(item);
  }
}

export async function* filter<TIn>(
  predicate: (t: TIn) => boolean,
  source: AsyncIterableIterator<TIn>
) {
  for await (const item of source) {
    if (predicate(item)) {
      yield item;
    }
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
