const SerialPort = require("serialport");
const events = require("events");
const LoopParser = require("./lib/loop-parser");
const parseLoopPacket = require("./lib/parseLoopPacket");

const config = require("./config");

const WeatherStation = new events.EventEmitter();

const port = new SerialPort(config.PORT, { baudRate: 19200 }, err => {
  if (err) return console.error;
});

const parser = port.pipe(new LoopParser());

port.on("open", () => {
  console.log(`Opened port ${config.PORT}`);
  port.write("\n", err => {
    if (err) {
      return console.error("Error:", err.message);
    }
  });

  parser.on("data", data => {
    console.log(new Date(), data, data.length);
    if (data.toString() === "ACK") {
      console.debug("Writing LOOP 1");
      port.write("LOOP 1\n");
      return;
    }
    if (data.toString("utf8", 1, 4) === "LOO" && data.length === 100) {
      data = data.slice(1);
      const parsedData = parseLoopPacket(data);
      const dataSubset = config.DESIRED_FIELDS.reduce(
        (newObj, property) => (
          (newObj[property] = parsedData[property]), newObj
        ),
        {}
      );
      WeatherStation.emit("loop", { _id: new Date(), ...dataSubset });
    }

    const loopRequestTimeout = setTimeout(() => {
      port.write("LOOP 1\n");
    }, 2000);
  });
});

const fs = require("fs");
const db = fs.createWriteStream("./database.txt");

const PouchDB = require("pouchdb");
const DB = new PouchDB("http://10.101.25.123:5984/wsd");

const saveData = data => {
  // db.write(JSON.stringify(data) + "\n");
  DB.put(data)
    .then(res => console.log(res))
    .catch(err => console.error(err.message));
};

WeatherStation.on("loop", data => {
  saveData(data);
  console.log(data);
});
