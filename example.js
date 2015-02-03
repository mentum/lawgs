var lawgs = require('./index');

// Lawgs configuration is mandatory
lawgs.config({
	aws: {
		accessKeyId: '********', /* Optional is credentials are set in ~/.aws/credentials */
		secretAccessKey: '******', /* Optional */
		region: 'us-east-1' /* Required */
	}
});

var logger  = lawgs.getOrCreate('SuperbowlLogs'); /* LogGroup */
var logger2 = lawgs.getOrCreate('SuperbowlLogs'); /* Returns the same instance (caching factory) */

// Logger configuration is optional
logger.config({
	// Shows the debugging messages
	showDebugLogs: true, /* Default to false */
	// Change the frequency of log upload, regardless of the batch size
	uploadMaxTimer: 1000, /* Defaults to 5000ms */
	// Max batch size. An upload will be triggered if this limit is reached within the max upload time
	uploadBatchSize: 10 /* Defaults to 500 */
});

/* 'error' is the log stream name */
logger.log('error', 'Argggg'); // Takes a string

logger.log('touchdown', { // or any serializable object
	team: 'Patriots',
	weight: 7
});
