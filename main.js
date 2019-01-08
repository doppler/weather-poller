const SerialPort = require("serialport");
const events = require("events");
const LoopParser = require("./lib/loop-parser");
const parseLoopPacket = require("./lib/parseLoopPacket");

const config = require("./config");

const WeatherStation = new events.EventEmitter();

const port = new SerialPort(config.PORT, { baudRate: 19200 }, err => {
  if (err) return console.error("Error:", err.message);
});

const parser = port.pipe(new LoopParser());

port.on("open", () => {
  console.log(`Opened port ${config.PORT}`);
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
      port.write("LOOP 1\n");
      return;
    }
    const parsedData = parseLoopPacket(data);
    const dataSubset = config.DESIRED_FIELDS.reduce(
      (newObj, property) => ((newObj[property] = parsedData[property]), newObj),
      {}
    );
    WeatherStation.emit("loop", { _id: new Date(), ...dataSubset });

    const loopRequestTimeout = setTimeout(() => {
      port.write("LOOP 1\n");
    }, 2000);
  });
});

const PouchDB = require("pouchdb");
const DB = new PouchDB("http://10.101.25.123:5984/wsd");

const saveData = data => {
  DB.put(data)
    .then(res => console.log(res))
    .catch(err => console.error(err.message));
};

WeatherStation.on("loop", data => {
  saveData(data);
  console.log(data);
});
