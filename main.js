require("dotenv").config();
const FixedLengthArray = require("./lib/fixed-length-array");
const { spawn } = require("child_process");
const io = require("socket.io-client");

const weatherStationFeed = spawn("node", ["vantage-poller.js"]);

let running = false;

const prevWindDirs = new FixedLengthArray(24);
const prevWindSpeeds = new FixedLengthArray((60 * 20) / 2); // 20 minutes

const run = conn => {
  if (running) return;
  running = true;
  weatherStationFeed.stdout.on("data", line => {
    let data;
    try {
      data = JSON.parse(line);
    } catch (err) {
      console.error(err);
      return;
    }
    if (typeof data === "undefined") return;
    prevWindDirs.push(data.windDirection);
    prevWindSpeeds.push(data.windSpeed);
    try {
      const record = {
        type: "weather",
        location: process.env.DZLOCATION,
        time: new Date(),
        ...data,
        prevWindDirs,
        prevWindSpeeds
      };
      console.log(JSON.stringify(record, ["time"]));
      socket.emit("weather-record", record);
      if (process.env.DEV_LOAD_CLOCK_SERVER) {
        devSocket.emit("weather-record", record);
      }
    } catch (err) {
      console.error(err);
    }
  });
};

const socket = io(process.env.LOAD_CLOCK_SERVER, {
  transports: ["websocket"]
});
socket.open();

socket.on("connect", () => {
  run();
  console.log(
    `opened socket to production server at ${process.env.LOAD_CLOCK_SERVER}`
  );
  // socket.emit("location", program.location, ack => console.log("ack", ack));
});

socket.on("connect_error", err => console.error("socket connect_error", err));
socket.on("connect_timeout", timeout =>
  console.error("socket connect_timeout", timeout)
);
socket.on("error", err => console.error("socket error", err));
socket.on("disconnect", reason => console.log("socket disconnect", reason));

let devSocket;
if (process.env.DEV_LOAD_CLOCK_SERVER) {
  devSocket = io(process.env.DEV_LOAD_CLOCK_SERVER, {
    transports: ["websocket"]
  });
  devSocket.open();
  devSocket.on("connect", () => {
    console.log(
      `opened socket to dev server at ${process.env.DEV_LOAD_CLOCK_SERVER}`
    );
  });
  devSocket.on("connect_error", err =>
    console.error("devSocket connect_error")
  );
  devSocket.on("connect_timeout", timeout =>
    console.error("socket connect_timeout", timeout)
  );
  devSocket.on("error", err => console.error("socket error", err));

  devSocket.on("disconnect", reason =>
    console.log("socket disconnect", reason)
  );
}
