"use strict";
var _asyncGenerator = (function() {
  function AwaitValue(value) {
    this.value = value;
  }
  function AsyncGenerator(gen) {
    var front, back;
    function send(key, arg) {
      return new Promise(function(resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };
        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }
    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;
        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(
            function(arg) {
              resume("next", arg);
            },
            function(arg) {
              resume("throw", arg);
            }
          );
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }
    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({ value: value, done: true });
          break;
        case "throw":
          front.reject(value);
          break;
        default:
          front.resolve({ value: value, done: false });
          break;
      }
      front = front.next;
      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }
    this._invoke = send;
    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }
  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
      return this;
    };
  }
  AsyncGenerator.prototype.next = function(arg) {
    return this._invoke("next", arg);
  };
  AsyncGenerator.prototype.throw = function(arg) {
    return this._invoke("throw", arg);
  };
  AsyncGenerator.prototype.return = function(arg) {
    return this._invoke("return", arg);
  };
  return {
    wrap: function wrap(fn) {
      return function() {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function _await(value) {
      return new AwaitValue(value);
    }
  };
})();

var range = (function() {
  var _ref = _asyncGenerator.wrap(
    /*#__PURE__*/ regeneratorRuntime.mark(function _callee(start, end) {
      var i;
      return regeneratorRuntime.wrap(
        function _callee$(_context) {
          while (1) {
            switch ((_context.prev = _context.next)) {
              case 0:
                i = start;

              case 1:
                if (!(i < end)) {
                  _context.next = 7;
                  break;
                }

                _context.next = 4;
                return i;

              case 4:
                i++;
                _context.next = 1;
                break;

              case 7:
              case "end":
                return _context.stop();
            }
          }
        },
        _callee,
        this
      );
    })
  );

  return function range(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

var reduce = (function() {
  var _ref2 = _asyncToGenerator(
    /*#__PURE__*/ regeneratorRuntime.mark(function _callee2(
      reducer,
      initial,
      source
    ) {
      var accumulator,
        _iteratorNormalCompletion,
        _didIteratorError,
        _iteratorError,
        _iterator,
        _step,
        _value,
        item;

      return regeneratorRuntime.wrap(
        function _callee2$(_context2) {
          while (1) {
            switch ((_context2.prev = _context2.next)) {
              case 0:
                accumulator = initial;
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context2.prev = 4;
                _iterator = _asyncIterator(source);

              case 6:
                _context2.next = 8;
                return _iterator.next();

              case 8:
                _step = _context2.sent;
                _iteratorNormalCompletion = _step.done;
                _context2.next = 12;
                return _step.value;

              case 12:
                _value = _context2.sent;

                if (_iteratorNormalCompletion) {
                  _context2.next = 19;
                  break;
                }

                item = _value;

                accumulator = reducer(accumulator, item);

              case 16:
                _iteratorNormalCompletion = true;
                _context2.next = 6;
                break;

              case 19:
                _context2.next = 25;
                break;

              case 21:
                _context2.prev = 21;
                _context2.t0 = _context2["catch"](4);
                _didIteratorError = true;
                _iteratorError = _context2.t0;

              case 25:
                _context2.prev = 25;
                _context2.prev = 26;

                if (!(!_iteratorNormalCompletion && _iterator.return)) {
                  _context2.next = 30;
                  break;
                }

                _context2.next = 30;
                return _iterator.return();

              case 30:
                _context2.prev = 30;

                if (!_didIteratorError) {
                  _context2.next = 33;
                  break;
                }

                throw _iteratorError;

              case 33:
                return _context2.finish(30);

              case 34:
                return _context2.finish(25);

              case 35:
                return _context2.abrupt("return", accumulator);

              case 36:
              case "end":
                return _context2.stop();
            }
          }
        },
        _callee2,
        this,
        [[4, 21, 25, 35], [26, , 30, 34]]
      );
    })
  );

  return function reduce(_x3, _x4, _x5) {
    return _ref2.apply(this, arguments);
  };
})();

function _asyncIterator(iterable) {
  if (typeof Symbol === "function") {
    if (Symbol.asyncIterator) {
      var method = iterable[Symbol.asyncIterator];
      if (method != null) return method.call(iterable);
    }
    if (Symbol.iterator) {
      return iterable[Symbol.iterator]();
    }
  }
  throw new TypeError("Object is not async iterable");
}

function _asyncToGenerator(fn) {
  return function() {
    var gen = fn.apply(this, arguments);
    return new Promise(function(resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }
        if (info.done) {
          resolve(value);
        } else {
          return Promise.resolve(value).then(
            function(value) {
              step("next", value);
            },
            function(err) {
              step("throw", err);
            }
          );
        }
      }
      return step("next");
    });
  };
}

exports.range = range;

exports.reduce = reduce;
function run(numberOfItems) {
  return reduce(
    function(accumulator, next) {
      return accumulator + next;
    },
    0,
    range(0, numberOfItems)
  );
}
exports.run = run;
