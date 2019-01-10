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
  const prevWindDirsBufferLen = 60; // 2 minutes
  const prevWindSpeedsBufferLen = (60 * 20) / 2; // 20 minutes
  let prevWindDirs = new Array(prevWindDirsBufferLen).fill(0);
  let prevWindSpeeds = new Array(prevWindSpeedsBufferLen).fill(0);
  weatherStationFeed.stdout.on("data", line => {
    const data = JSON.parse(line);
    prevWindDirs.push(data.windDirection);
    prevWindSpeeds.push(data.windSpeed);
    prevWindDirs =
      prevWindDirs.length > prevWindDirsBufferLen
        ? prevWindDirs.slice(1, prevWindDirsBufferLen + 1)
        : prevWindDirs;
    prevWindSpeeds =
      prevWindSpeeds.length > prevWindSpeedsBufferLen
        ? prevWindSpeeds.slice(1, prevWindSpeedsBufferLen + 1)
        : prevWindSpeeds;
    if (Math.max(...prevWindSpeeds) === 0) prevWindSpeeds.splice(0, 0, 5);
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
