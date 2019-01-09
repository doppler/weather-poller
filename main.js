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

const run = conn => {
  weatherStationFeed.stdout.on("data", data => {
    try {
      const record = {
        id: `${program.location}-current`,
        type: "weather",
        location: program.location,
        time: new Date(),
        ...JSON.parse(data)
      };
      console.log(record);
      r.table(program.dbTable)
        .insert(record, { conflict: "replace" })
        .run(conn, (err, result) => {
          if (err) throw err;
          // console.log(result);
        });
    } catch (err) {
      console.error(err);
    }
  });
};

r.connect({ host: program.dbHost })
  .then(conn => {
    run(conn);
  })
  .catch(err => console.error(err));
