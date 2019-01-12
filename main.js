const FixedLengthArray = require("./lib/fixed-length-array");
const program = require("commander");
const { spawn } = require("child_process");
const io = require("socket.io-client");

const weatherStationFeed = spawn("node", ["vantage-poller.js"]);

program
  .version("0.0.1")
  // .option("-h --host <host>", "server host")
  // .option("-p --port <port>", "server port")
  .option("-l --location <location>", "Weather station location")
  .parse(process.argv);

if (!program.location) {
  console.error(program.outputHelp());
  process.exit(1);
}
const run = conn => {
  const prevWindDirs = new FixedLengthArray(24);
  const prevWindSpeeds = new FixedLengthArray((60 * 20) / 2); // 20 minutes
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
        id: `${program.location}-current`,
        type: "weather",
        location: program.location,
        time: new Date(),
        ...data,
        prevWindDirs,
        prevWindSpeeds
      };
      console.log(JSON.stringify(record, ["time"]));
      socket.emit("weather-record", record);
      devSocket.emit("weather-record", record);
    } catch (err) {
      console.error(err);
    }
  });
};

const socket = io(`https://spaceland-load-clock.herokuapp.com`, {
  transports: ["websocket"]
});
socket.open();

socket.on("connect", () => {
  run();
  console.log(
    "opened socket to production server at https://spaceland-load-clock.herokuapp.com"
  );
  // socket.emit("location", program.location, ack => console.log("ack", ack));
});

socket.on("connect_error", err => console.error("socket connect_error", err));
socket.on("connect_timeout", timeout =>
  console.error("socket connect_timeout", timeout)
);
socket.on("error", err => console.error("socket error", err));
socket.on("disconnect", reason => console.log("socket disconnect", reason));

const devSocket = io("http://10.101.25.123:5000", {
  transports: ["websocket"]
});
devSocket.open();
devSocket.on("connect", () => {
  console.log(
    "opened socket to development server at http://10.101.25.123:5000"
  );
});
devSocket.on("connect_error", err => console.error("devSocket connect_error"));
devSocket.on("connect_timeout", timeout =>
  console.error("socket connect_timeout", timeout)
);
devSocket.on("error", err => console.error("socket error", err));
devSocket.on("disconnect", reason => console.log("socket disconnect", reason));
