const deferred = () => {
  let resolve;
  return { promise: new Promise(r => (resolve = r)), resolve };
};

export async function* sleepSort(values) {
  let deferreds = Array.from(Array(values.length), deferred);
  let index = 0;
  for (const value of values) {
    setTimeout(() => deferreds[index++].resolve(value), value * 500);
  }
  for (let i = 0; i < values.length; i++) {
    yield await deferreds[i].promise;
  }
}

async function run() {
  for await (const value of sleepSort([4, 5, 2, 7, 8, 1])) {
    console.log(value);
  }
}

run().then(() => console.log("done"));
