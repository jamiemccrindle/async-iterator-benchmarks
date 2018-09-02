function* infiniteFiboncci() {
  let [n1, n2] = [1, 1];
  yield n1;
  while (true) {
    yield n2;
    [n1, n2] = [n2, n1 + n2];
  }
}


for(const value of infiniteFiboncci()) {
  if(value > 4000000) {
    break;
  }
  console.log(value);
}