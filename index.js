var AWS 		= require('aws-sdk'),
Q 				= require('q'),
Rx 				= require('rx'),
extend 			= require('extend'),
Enumerable 		= require('linq');
var EventEmitter= require('events').EventEmitter;
var util 		= require("util");

var cw;

var DEFAULT_TIMEOUT = 5000;

var loggers = {}; // Cache

var settings = {
	aws: { timeout: DEFAULT_TIMEOUT },
	cloudwatch: { }
};

var DATA_ACCEPTED = 'DataAlreadyAcceptedException',
	INVALID_TOKEN = 'InvalidSequenceTokenException';

function CloudWatchLogger(logGroupName) {
	var me = this;

	// Public properties
	this.showDebugLogs 		= false;
	this.uploadMaxTimer 	= 5000;
	this.uploadBatchSize 	= 500;

	// Private members
	var logGroupName = logGroupName;
	var logGroupExists = false;
	var knownLogStreams = {};
	var nextSequenceTokens = {}; // to ensure sequential upload of logs

	var logsSource = new Rx.Subject();
	var logsStream = logsSource; // Uninitialized yet

	// Read-only properties
	this.__defineGetter__('settings', function() { return settings; });

	// Private functions
	var _log = function() {
		if(me.showDebugLogs) {
			console.log.apply(me, arguments);
		}
	};

	var uploadQueuedLogs = function(logs) {
		_log(logGroupName, '>> uploadQueuedLogs triggered with ', logs.length, ' logs');
		
		var createLogGroup = Q(true);
		if(!logGroupExists) {
			createLogGroup = _createLogGroupIfDoesntExist(logGroupName)
			.then(function() { logGroupExists = true; })
			.catch(function(err) { console.error(err); });
		}

		createLogGroup.then(function() {
			Enumerable.from(logs)
			.groupBy("$.type")
			.forEach(function(group) {
				var logStreamName = group.key(),
				logsToUpload = group.getSource(),
				createLogStream = Q(true);

				if(!(logStreamName in knownLogStreams)) {
					createLogStream = _createLogStreamIfDoesntExist(logGroupName, logStreamName)
					.then(function() { knownLogStreams[logStreamName] = true; })
					.catch(function(err) { console.error(err); });
				}

				createLogStream.then(function() {

					logsToUpload.forEach(function(l) {
						delete l.type;
					});

					_uploadLogs(logGroupName, logStreamName, logsToUpload, nextSequenceTokens[logStreamName])
						.then(function(response) {
							nextSequenceTokens[logStreamName] = response.nextSequenceToken;
							_log('Logs uploaded');
							me.emit('uploaded');
						})
						.catch(function(err){ console.log(err); });
				});

			})
		});

	};

	var subscription = logsStream.subscribe(uploadQueuedLogs);

	var initializeStream = function() {
		if(typeof subscription.dispose === 'function') {
			subscription.dispose(); // dispose
			_log('Disposed subscription');
		}

		logsStream = logsSource
		.windowWithTimeOrCount(me.uploadMaxTimer, me.uploadBatchSize)
		.selectMany(function (x) { return x.toArray(); })
		.where(function(x) { return x.length > 0; });

		subscription = logsStream.subscribe(uploadQueuedLogs);
		_log('Resubscribed');
	};

	// Public API
	this.config = function(conf) {
		extend(this, conf);
		
		if(conf.settings) {
			settings = conf.settings;
		}

		AWS.config.update(settings.aws);
		cw = new AWS.CloudWatchLogs({ apiVersion: '2015-01-28' });
		initializeStream();
	};

	this.log = function(type, obj) {
		obj = { 
			message: typeof obj === 'string' ? obj : JSON.stringify(obj), 
			timestamp: new Date().getTime(), 
			type: type 
		};

		logsSource.onNext(obj);
	};

	/* Log group functions */
	function _createLogGroupIfDoesntExist(name) {
		return _checkLogGroupExists(name)
		.then(function(logGroupExists) {
			if(!logGroupExists) return _createLogGroup(name)
		});
	}

	function _checkLogGroupExists(name) {
		_log('Checking if log group exists:', name);
		var deferred = Q.defer();

		var params = {
			logGroupNamePrefix: name
		};

		cw.describeLogGroups(params, function(err, data) {
			if (err)	deferred.reject(err);
			else		deferred.resolve(data.logGroups.length > 0);
		});

		return deferred.promise.timeout(settings.aws.timeout 
			|| DEFAULT_TIMEOUT, 'Could not communicate with AWS CloudWatch in a timely fashion');
	}

	function _createLogGroup(name) {
		_log('Creating log group:', name);
		var deferred = Q.defer();

		cw.createLogGroup({ logGroupName: name }, function(err, data) {
			if (err)	deferred.reject(err);
			else		deferred.resolve(name);
		});

		return deferred.promise.timeout(settings.aws.timeout 
			|| DEFAULT_TIMEOUT, 'Could not create log group in a timely fashion');
	}

	/* Log streams functions */
	function _createLogStreamIfDoesntExist(group, name) {
		return _checkLogStreamExists(group, name)
		.then(function(logStreamExists) {
			if(!logStreamExists) return _createLogStream(group, name);
		});
	}

	function _checkLogStreamExists(group, name) {
		_log('Checking if log stream exists:', name);
		var deferred = Q.defer();

		var params = {
			logGroupName: group,
			logStreamNamePrefix: name
		};

		cw.describeLogStreams(params, function(err, data) {
			if (err)	deferred.reject(err);
			else		deferred.resolve(data.logStreams.length > 0);
		});

		return deferred.promise.timeout(settings.aws.timeout 
			|| DEFAULT_TIMEOUT, 'Could not communicate with AWS in a timely fashion');
	}

	function _createLogStream(group, name) {
		_log('Creating log stream:', name);
		var deferred = Q.defer();

		cw.createLogStream({ logGroupName: group, logStreamName: name }, function(err, data) {
			if (err)	deferred.reject(err);
			else		deferred.resolve(name);
		});

		return deferred.promise.timeout(settings.aws.timeout 
			|| DEFAULT_TIMEOUT, 'Could not create log stream in a timely fashion');
	}

	// Logging functions
	function _uploadLogs(group, stream, logs, key) {
		_log('Uploading logs');
		var deferred = Q.defer();

		var params = {
			logEvents: logs,
			logGroupName: group,
			logStreamName: stream
		};

		if(key !== undefined && typeof key === 'string') {
			params.sequenceToken = key;
		}

		cw.putLogEvents(params, function(err, data) {
			if (err) {
				if(err.code ===  DATA_ACCEPTED || err.code === INVALID_TOKEN) {
					var nextToken = err.message.split(': ')[1];
					_log('Getting sequence token', nextToken);
					deferred.resolve(_uploadLogs(group, stream, logs, nextToken));
				} else {
					console.error(err);
					deferred.reject(err);
				}
			}
			else deferred.resolve(data);
		});

		return deferred.promise.timeout(settings.aws.timeout 
			|| DEFAULT_TIMEOUT, 'Could not communicate with AWS in a timely fashion');
	}

	this.config({ });
};

util.inherits(CloudWatchLogger, EventEmitter);

module.exports = {

	getOrCreate: function(logGroupName) {
		if(!loggers.hasOwnProperty(logGroupName)) {
			loggers[logGroupName] = new CloudWatchLogger(logGroupName);
		}

		return loggers[logGroupName];
	},

	config: function(s) {
		extend(true, settings, s);
	}

};
