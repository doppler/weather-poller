const SerialPort = require("serialport");
const parseLoopPacket = require("./lib/parseLoopPacket");

const PORT = "COM1";
const port = new SerialPort(PORT, { baudRate: 19200 }, err => {
  if (err) return console.error;
});

const getData = () => {
  port.write("LOOP 1\n", err => {
    if (err) {
      console.log("Error:", err);
    }
  });
};

port.on("open", () => {
  console.log(`Opened port ${PORT}`);
  port.write("\n", err => {
    if (err) {
      return console.log("Error:", err.message);
    }
  });

  port.on("data", data => {
    if (data.toString() === "\n\r") {
      console.debug("Device is awake.");
      port.write("LOOP 1\n");
      return;
    }
    console.log("Data:", data, data.length);
    if (data.length === 100) {
      data = data.slice(1);
      const parsedData = parseLoopPacket(data);
      console.log("Parsed Data:", parsedData);
    }

    setTimeout(() => {
      port.write("LOOP 1\n");
    }, 2000);
  });
});
