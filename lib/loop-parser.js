const Transform = require("stream").Transform;

const LOOP_PACKET_SIZE = 100;

class LoopParser extends Transform {
  constructor(options = {}) {
    super(options);
    this.position = 0;
    this.buffer = Buffer.alloc(LOOP_PACKET_SIZE);
  }

  _transform(chunk, encoding, cb) {
    let cursor = 0;
    if (chunk.toString("hex") === "0a0d") {
      this.push("ACK");
      this.buffer = Buffer.alloc(LOOP_PACKET_SIZE);
      cb();
      return;
    }
    while (cursor < chunk.length) {
      this.buffer[this.position] = chunk[cursor];
      cursor++;
      this.position++;
      if (this.position === LOOP_PACKET_SIZE) {
        this.push(this.buffer);
        this.buffer = Buffer.alloc(LOOP_PACKET_SIZE);
        this.position = 0;
      }
    }
    cb();
  }

  _flush(cb) {
    this.push(this.buffer.slice(0, this.position));
    this.buffer = Buffer.alloc(LOOP_PACKET_SIZE);
    cb();
  }
}

module.exports = LoopParser;
