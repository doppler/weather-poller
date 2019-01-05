const SerialPort = require("serialport");
const events = require("events");
const parseLoopPacket = require("./lib/parseLoopPacket");

const config = require("./config");

const WeatherStation = new events.EventEmitter();

const port = new SerialPort(config.PORT, { baudRate: 19200 }, err => {
  if (err) return console.error;
});

port.on("open", () => {
  console.log(`Opened port ${config.PORT}`);
  port.write("\n", err => {
    if (err) {
      return console.error("Error:", err.message);
    }
  });

  port.on("data", data => {
    console.log(new Date(), data, data.length);
    if (data.toString() === "\n\r") {
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

const saveData = data => {
  db.write(JSON.stringify(data) + "\n");
};

WeatherStation.on("loop", data => {
  saveData(data);
  console.log(data);
});
