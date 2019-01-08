const Transform = require("stream").Transform;

class LoopParser extends Transform {
  constructor(options = {}) {
    super(options);
    this.position = 0;
    this.buffer = Buffer.alloc(100);
  }

  _transform(chunk, encoding, cb) {
    let cursor = 0;
    console.log("chunk", chunk);
    if (chunk.toString("hex") === "0a0d") {
      this.push("ACK");
      this.buffer = Buffer.alloc(100);
      cb();
      return;
    }
    while (cursor < chunk.length) {
      this.buffer[this.position] = chunk[cursor];
      cursor++;
      this.position++;
      if (this.position === 100) {
        this.push(this.buffer);
        this.buffer = Buffer.alloc(100);
        this.position = 0;
      }
    }
    cb();
  }

  _flush(cb) {
    this.push(this.buffer.slice(0, this.position));
    this.buffer = Buffer.alloc(100);
    cb();
  }
}

module.exports = LoopParser;
