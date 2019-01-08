const jsonFromVantageLoopPacket = buffer => {
  return {
    barTrend: buffer.readInt8(3),
    barometer: buffer.readUInt16LE(7),
    insideTemp: buffer.readUInt16LE(9) / 10,
    insideHumidity: buffer.readUInt8(11),
    outsideTemp: buffer.readUInt16LE(12) / 10,
    windSpeed: buffer.readUInt8(14),
    windSpeed10Min: buffer.readUInt8(15),
    windDirection: buffer.readUInt16LE(16),
    outsideHumidity: buffer.readUInt8(33),
    rainRate: buffer.readUInt16LE(41),
    uv: buffer.readUInt8(43),
    solarRadiation: buffer.readUInt16LE(44),
    stormRain: buffer.readUInt16LE(46)
  };
};

module.exports = jsonFromVantageLoopPacket;
