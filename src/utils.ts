export function deferredObserver(deferred: { resolve: () => void }) {
  return {
    error: (error: any) => {
      console.log(error);
    },
    complete: () => {
      deferred.resolve();
    }
  };
}

function padl(n: number, s: string) {
  while (s.length < n) {
    s += " ";
  }
  return s;
}

function padr(n: number, s: string) {
  while (s.length < n) {
    s = " " + s;
  }
  return s;
}

export function logResults(e: any) {
  const t = e.target;

  if (t.failure) {
    console.error(padl(10, t.name) + "FAILED: " + e.target.failure);
  } else {
    const result =
      padl(18, t.name) +
      padr(13, t.hz.toFixed(2) + " op/s") +
      " \xb1" +
      padr(7, t.stats.rme.toFixed(2) + "%") +
      padr(15, " (" + t.stats.sample.length + " samples)");

    console.log(result);
  }
}

export function logStart(name: string) {
  console.log(name);
  console.log("-------------------------------------------------------");
}

export function logComplete() {
  console.log("-------------------------------------------------------");
}
