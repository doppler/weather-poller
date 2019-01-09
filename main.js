const program = require("commander");
const { spawn } = require("child_process");
const r = require("rethinkdb");

const weatherStationFeed = spawn("node", ["vantage-poller.js"]);

program
  .version("0.0.1")
  .option("-h --db-host <host>", "RethinkDB host")
  .option("-p --db-port <port>", "RethinkDB port")
  .option("-t --db-table <name>", "RethinkDB table")
  .option("-l --location <location>", "Weather station location")
  .parse(process.argv);

if (!program.dbHost || !program.dbTable || !program.location) {
  console.error(program.outputHelp());
  process.exit(1);
}

let sequence = 0;

const setSequence = conn => {
  try {
    r.table(program.dbTable)
      .filter({ type: "weather", location: program.location })
      .max("sequence")
      .run(conn, (err, result) => {
        console.log("result", result);
        if (result) {
          sequence = result.sequence;
          console.log("setSequence", result.sequence);
        }
      });
  } catch (err) {
    console.error(err);
  }
};

const run = conn => {
  setSequence(conn);
  weatherStationFeed.stdout.on("data", data => {
    sequence++;
    try {
      const record = {
        sequence,
        type: "weather",
        location: program.location,
        time: new Date(),
        ...JSON.parse(data)
      };
      console.log(record);
      r.table(program.dbTable)
        .insert(record)
        .run(conn, (err, result) => {
          if (err) throw err;
          // console.log(result);
          deleteOlderEntries(conn);
        });
    } catch (err) {
      console.error(err);
    }
    if (typeof record !== "undefined") {
    }
  });
};

r.connect({ host: program.dbHost })
  .then(conn => {
    run(conn);
  })
  .catch(err => console.error(err));

const deleteOlderEntries = conn => {
  try {
    r.table(program.dbTable)
      .filter({ type: "weather", location: program.location })
      .filter(r.row("sequence").lt(sequence - 900))
      .delete()
      .run(conn, (err, result) => {
        if (err) throw err;
        // console.log(result);
      });
  } catch (err) {
    console.error(err);
  }
};
