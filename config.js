const config = {
  PORT: "COM1",
  DESIRED_FIELDS: [
    "insideTemperature",
    "insideHumidity",
    "outsideTemperature",
    "windSpeed",
    "windSpeed10Min",
    "windDirection"
  ],
  COUCHDB: "http://10.101.25.123:5984/wsd"
};

module.exports = config;
