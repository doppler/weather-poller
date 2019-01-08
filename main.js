const SerialPort = require("serialport");
const VantageLoopPacketParser = require("./lib/vantage-loop-packet-parser");
const jsonFromVantageLoopPacket = require("./lib/json-from-vantage-loop-packet");

const config = require("./config");

const port = new SerialPort(config.PORT, { baudRate: 19200 }, err => {
  if (err) return console.error("Error:", err.message);
});

const parser = port.pipe(new VantageLoopPacketParser());

port.on("open", () => {
  const requestLoop = () => port.write("LOOP 1\n");
  // "wakes up" console
  port.write("\n", err => {
    if (err) {
      return console.error("Error:", err.message);
    }
  });

  parser.on("data", data => {
    // After recieving "wake up", console replies, and our parser transforms
    // the reply to "ACK". We can now send the "LOOP 1" command.
    if (data.toString() === "ACK") {
      return requestLoop();
    }
    const weatherStationData = jsonFromVantageLoopPacket(data.slice(1));
    process.stdout.write(
      JSON.stringify({ _id: new Date(), ...weatherStationData }) + "\n"
    );

    setTimeout(() => {
      requestLoop();
    }, 2000);
  });
});
