require("dotenv").config();
const fs = require("fs");
const path = require("path");
const SerialPort = require("serialport");
const VantageLoopPacketParser = require("./vantage-loop-packet-parser");
const jsonFromVantageLoopPacket = require("./json-from-vantage-loop-packet");
const io = require("socket.io-client");
const { differenceInSeconds } = require("date-fns");

const FixedLengthArray = require("./fixed-length-array");

const prevWindDirs = new FixedLengthArray(24);
const prevWindSpeeds = new FixedLengthArray((60 * 20) / 2); // 20 minutes

console.log(path.join(__dirname, "woot"));
const weatherStationPoller = () => {
  // load saved wind metrics after restart
  try {
    const savedWinds = require("./prevWinds.json");
    savedWinds.prevWindDirs.forEach(i => prevWindDirs.push(i));
    savedWinds.prevWindSpeeds.forEach(i => prevWindSpeeds.push(i));
  } catch (e) {
    console.error("Couldn't find ./prevWinds.json. Oh well.");
  }

  let consoleIsAwake = false;
  const requestLoop = () => {
    if (port.isOpen && consoleIsAwake) {
      port.write("LOOP 1\n");
    }
  };
  const wakeConsole = () => {
    port.write("\n", err => console.error);
  };

  let socket, devSocket, port, parser, lastUpdate;
  const initializeSerialPort = () => {
    port = new SerialPort(process.env.SERIALPORT, { baudRate: 19200 }, err => {
      if (err) {
        console.error(
          "Error:",
          err.message,
          `-- Ensure ${path.basename(__filename)} isn't already running.`
        );
        process.exit(1);
      }
    });
    parser = port.pipe(new VantageLoopPacketParser());
    port.on("close", () => initializeSerialPort());
    port.on("open", () => {
      console.log(`Opened serial port ${process.env.SERIALPORT}`);
      wakeConsole();
      parser.on("data", buffer => {
        // console.log("data ", data, data.length);
        // After recieving "wake up", console replies, and our parser transforms
        // the reply to "ACK". We can now send the "LOOP 1" command.
        if (buffer.toString() === "ACK") {
          consoleIsAwake = true;
          // clearInterval(loopRequestInterval);
          // loopRequestInterval = setInterval(() => {
          return requestLoop();
        }
        const data = jsonFromVantageLoopPacket(buffer.slice(1));
        console.log(data);
        prevWindDirs.push(data.windDirection);
        prevWindSpeeds.push(data.windSpeed);
        const record = {
          type: "weather",
          location: process.env.DZLOCATION,
          ...data,
          prevWindDirs,
          prevWindSpeeds
        };
        // save wind metrics in case we have to restart
        const s = fs.createWriteStream("./prevWinds.json");
        s.write(JSON.stringify({ prevWindDirs, prevWindSpeeds }));
        s.end();
        // write to frontend app servers
        if (socket) {
          socket.emit("weather-record", record);
        }
        if (devSocket) {
          devSocket.emit("weather-record", record);
        }
        lastUpdate = new Date();
      });
    });
  };
  initializeSerialPort();

  setInterval(() => {
    requestLoop();
  }, 2000);
  // app hangs after awhile and i don't know why. maybe try
  // turning the serialport off and back on again
  setInterval(() => {
    console.log(new Date(), "PING");
    if (Math.abs(differenceInSeconds(new Date(), lastUpdate)) > 10) {
      port.close();
    }
  }, 10000);
  socket = io(process.env.LOAD_CLOCK_SERVER, {
    transports: ["websocket"]
  });
  socket.on("connect", () => {
    console.log(
      `opened socket to production server at ${process.env.LOAD_CLOCK_SERVER}`
    );
  });
  if (process.env.DEV_LOAD_CLOCK_SERVER) {
    devSocket = io(process.env.DEV_LOAD_CLOCK_SERVER, {
      transports: ["websocket"]
    });
    devSocket.on("connect", () => {
      console.log(
        `opened socket to dev server at ${process.env.DEV_LOAD_CLOCK_SERVER}`
      );
    });
  }
};
module.exports = weatherStationPoller;
