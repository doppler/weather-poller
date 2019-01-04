const SerialPort = require("serialport");
const parseLoopPacket = require("./lib/parseLoopPacket");

const config = require("./config");

const port = new SerialPort(config.PORT, { baudRate: 19200 }, err => {
  if (err) return console.error;
});

const getData = () => {
  port.write("LOOP 1\n", err => {
    if (err) {
      console.error("Error:", err);
    }
  });
};

port.on("open", () => {
  console.log(`Opened port ${config.PORT}`);
  port.write("\n", err => {
    if (err) {
      return console.error("Error:", err.message);
    }
  });

  port.on("data", data => {
    console.log("Data:", data, data.length);
    if (data.toString() === "\n\r") {
      console.debug("Writing LOOP 1");
      port.write("LOOP 1\n");
      return;
    }
    if (data.toString("utf8", 1, 4) === "LOO" && data.length >= 19) {
      data = data.slice(1);
      const parsedData = parseLoopPacket(data);
      const dataSubset = config.DESIRED_FIELDS.reduce(
        (newObj, property) => (
          (newObj[property] = parsedData[property]), newObj
        ),
        {}
      );
      // console.log("Parsed Data Subset:", dataSubset);
      postDataToCouchDb(dataSubset);
    }

    setTimeout(() => {
      port.write("LOOP 1\n");
    }, 2500);
  });
});

const axios = require("axios");

const postDataToCouchDb = data => {
  const record = { _id: new Date(), ...data };
  axios
    .post(config.COUCHDB, record)
    .then(res => {
      console.debug(JSON.stringify(record));
      // console.log("statusText:", res.statusText);
    })
    .catch(error => console.error(error));
};
