module.exports = class FixedLengthArray extends Array {
  constructor(length) {
    super(length).fill(0);
  }

  push(value) {
    super.push(value);
    this.shift();
  }
};
