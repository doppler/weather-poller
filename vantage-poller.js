require("dotenv").config();
const SerialPort = require("serialport");
const VantageLoopPacketParser = require("./lib/vantage-loop-packet-parser");
const jsonFromVantageLoopPacket = require("./lib/json-from-vantage-loop-packet");
let consoleIsAwake = false;
let loopRequestInterval;
const port = new SerialPort(
  process.env.SERIALPORT,
  { baudRate: 19200 },
  err => {
    if (err) return console.error("Error:", err.message);
  }
);
const parser = port.pipe(new VantageLoopPacketParser());
const requestLoop = () => {
  if (port.isOpen && consoleIsAwake) {
    port.write("LOOP 1\n");
  }
};
const wakeConsole = () => {
  port.write("\n", err => console.error);
};
port.on("open", () => {
  wakeConsole();
  parser.on("data", data => {
    // console.log("data ", data, data.length);
    // After recieving "wake up", console replies, and our parser transforms
    // the reply to "ACK". We can now send the "LOOP 1" command.
    if (data.toString() === "ACK") {
      consoleIsAwake = true;
      clearInterval(loopRequestInterval);
      loopRequestInterval = setInterval(() => {
        requestLoop();
      }, 2000);
      return requestLoop();
    }
    process.stdout.write(
      JSON.stringify(jsonFromVantageLoopPacket(data.slice(1))) + "\n"
    );
  });
});
