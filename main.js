const program = require("commander");
const { spawn } = require("child_process");
const r = require("rethinkdb");

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
r.connect({ host: program.dbHost }).then(conn => {
  weatherStationFeed.stdout.on("data", data => {
    const record = {
      type: "weather",
      location: program.location,
      time: new Date(),
      ...JSON.parse(data)
    };
    console.log(record);
    r.table(program.dbTable)
      .insert(record)
      .run(conn, (err, cursor) => {
        if (err) throw err;
      });
  });
});

const weatherStationFeed = spawn("node", ["vantage-poller.js"]);
