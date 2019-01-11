const FixedLengthArray = require("./lib/fixed-length-array");
const program = require("commander");
const { spawn } = require("child_process");
const io = require("socket.io-client");

const weatherStationFeed = spawn("node", ["vantage-poller.js"]);

program
  .version("0.0.1")
  .option("-h --host <host>", "server host")
  .option("-p --port <port>", "server port")
  .option("-l --location <location>", "Weather station location")
  .parse(process.argv);

if (!program.host || !program.port || !program.location) {
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
      console.log(JSON.stringify(record));
      socket.emit("weather-record", record);
    } catch (err) {
      console.error(err);
    }
  });
};

const socket = io(`http://${program.host}:${program.port}`, {
  transports: ["websocket"]
});
socket.open();

socket.on("connect", () => {
  run();
  console.log("attempting socket connection");
  // socket.emit("location", program.location, ack => console.log("ack", ack));
});

socket.on("connect_error", err => console.error);
socket.on("connect_timeout", timeout => console.error);
socket.on("error", err => console.error);
socket.on("disconnect", reason => console.log);
