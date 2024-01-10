const fs = require("fs");
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label, printf } = format;

// Log directory setup
const logDir = "log";
if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir);
}

// Log formatting
const tsFormat = () => new Date().toLocaleTimeString();
const logFormat = printf(
	(info) => `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`
);

// Create a logger instance
const logger = createLogger({
	format: combine(label({ label: "" }), timestamp(), logFormat),
	transports: [
		// Log errors to error.log
		new transports.File({
			timestamp: tsFormat,
			filename: `${logDir}/error.log`,
			level: "error",
		}),
		// Log info to combined.log
		new transports.File({
			timestamp: tsFormat,
			filename: `${logDir}/combined.log`,
			level: "info",
		}),
		// Log debug to debug.log
		new transports.File({
			filename: `${logDir}/debug.log`,
			timestamp: tsFormat,
			level: "debug",
		}),
	],
});

// Optionally, also log to console with colors
logger.add(
	new transports.Console({
		format: combine(format.colorize(), timestamp(), logFormat),
	})
);

module.exports = logger;
