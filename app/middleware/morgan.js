const morgan = require("morgan");
const logger = require("../utills/logger");

module.exports = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  {
    stream: logger.stream,
    skip: (req, res) => res.statusCode < 400 // Skip logging successful requests to reduce noise
  }
);