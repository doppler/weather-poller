require("dotenv").config();
const io = require("socket.io-client");
const { Connection, Request, TYPES, TDS_VERSION } = require("tedious");
const difference = require("deep-diff");

const JumpRunPoller = () => {
  if (!checkForEnvFile()) return;
  const SQL = `
SELECT
  tMani.nLoad AS loadNumber,
  (tMani.nCapacity - tMani.nRiders) AS slotsRemaining,
  tMani.dtDepart AS departureTime,
  tPlane.sName AS plane
FROM tMani
JOIN tPlane ON (
  tMani.nPlaneId = tPlane.nId
)
WHERE tMani.nStatus > 1
AND tMani.nStatus < 4
`;

  let previousResult = [];

  const run = () => {
    const req = new Request(SQL, (err, rowCount) => {
      if (err) {
        console.log("request error");
      }
    });

    const loads = [];

    req.on("row", columns => {
      const row = {};
      Object.keys(columns).map(key => (row[key] = columns[key].value));
      loads.push(row);
    });
    req.on("requestCompleted", () => {
      if (difference(loads, previousResult)) {
        socket.emit("load-announcement", {
          location: process.env.DZLOCATION,
          time: new Date(),
          loads
        });
        if (process.env.DEV_LOAD_CLOCK_SERVER) {
          devSocket.emit("load-announcement", {
            location: process.env.DZLOCATION,
            time: new Date(),
            loads
          });
        }
        process.stdout.write(`${new Date()} ${JSON.stringify(loads)}\n`);
      }
      previousResult = loads;
    });
    conn.execSql(req);
  };

  const config = {
    server: process.env.DBSERVER,
    options: {
      encrypt: false,
      tdsVersion: "7_1",
      useColumnNames: true,
      useUTC: false
    },
    authentication: {
      type: "default",
      options: {
        userName: process.env.DBUSERNAME,
        password: process.env.DBPASSWORD
      }
    }
  };

  const conn = new Connection(config);
  let runInterval;
  conn.on("connect", err => {
    if (err) {
      console.log("connection err", err);
      process.exit(1);
    } else {
      runInterval = setInterval(() => {
        run();
      }, process.env.DBREQUESTINTERVAL * 1000);
    }
  });
  conn.on("end", () => {
    clearInterval(runInterval);
  });
  // conn.on("debug", message => console.log("DEBUG", message));
  // conn.on("infoMessage", message => console.log("infoMessage", message));
  // conn.on("error", error => console.error("on error", error));

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

  const devSocket = io(process.env.DEV_LOAD_CLOCK_SERVER, {
    transports: ["websocket"]
  });
  devSocket.open();
  devSocket.on("connect", () => {
    console.log(
      `opened socket to development server at ${
        process.env.DEV_LOAD_CLOCK_SERVER
      }`
    );
  });
  devSocket.on("location", socket => {
    socket.emit("load", {
      location: process.env.DZLOCATION,
      loads: previousResult
    });
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
};
module.exports = JumpRunPoller;

const checkForEnvFile = () => {
  const exampleConfig = `
  DBSERVER=10.101.20.12
  DBUSERNAME=exuser
  DBPASSWORD=expass
  DBREQUESTINTERVAL=5
  DZLOCATION=ATL
  LOAD_CLOCK_SERVER=https://spaceland-load-clock.herokuapp.com
  # DEV_LOAD_CLOCK_SERVER=http://10.101.25.123:5000
  `;
  const {
    DBSERVER,
    DBUSERNAME,
    DBPASSWORD,
    DBREQUESTINTERVAL,
    DZLOCATION,
    LOAD_CLOCK_SERVER
  } = process.env;
  if (
    !DBSERVER ||
    !DBUSERNAME ||
    !DBPASSWORD ||
    !DBREQUESTINTERVAL ||
    !DZLOCATION ||
    !LOAD_CLOCK_SERVER
  ) {
    console.log(
      "Please edit the ./.env file to configure settings. Here is an example config:"
    );
    console.log(exampleConfig);
    setTimeout(() => {
      process.exit(0);
    }, 1000 * 60);
    return false;
  }
  return true;
};
