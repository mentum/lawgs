![logo](./logo50x50.png) Lawgs
==============================

Nodejs logging to CloudWatch Logs made easy

## Features
- Creates Log Groups automatically
- Creates Log Streams automatically
- Periodic upload
- Automatic log batching
- JSON logging support
- logger instances are shared across modules

## Get it
``` npm install lawgs ```

## How to use it

The only required configurations are the AWS configurations.

```js
var lawgs = require('./index');

lawgs.config({
	aws: {
		accessKeyId: '********', /* Optional if credentials are set in ~/.aws/credentials */
		secretAccessKey: '******', /* Optional */
		region: 'us-east-1' /* Required */
	}
});
```

If you are using roles, you will need the following roles:
- logs:DescribeLogGroups
- logs:DescribeLogStreams
- logs:CreateLogGroup
- logs:CreateLogStream
- logs:PutLogEvents

Simply create your logger and you are ready to go.

```js
var logger  = lawgs.getOrCreate('SuperbowlLogs'); /* LogGroup */
logger.log('touchdown', { team: 'Patriots', weight: 7 });
```

## Example
See ```example.js``` for a full working example.

Running the example, you get the following output:
```
Disposed subscription
Resubscribed
SuperbowlLogs >> uploadQueuedLogs triggered with  2  logs
Checking if log group exists: SuperbowlLogs
Creating log group: SuperbowlLogs
Checking if log stream exists: error
Checking if log stream exists: touchdown
Creating log stream: error
Creating log stream: touchdown
Uploading logs
Uploading logs
Logs uploaded
Logs uploaded
```

## Roadmap
- S3 logs archiving

## Contributing
Feel free to open issues and open pull requests.

## Related projects
[Lambdaws](https://github.com/mentum/lambdaws) (AWS Lambda Wrapper)

[Superbowl Notifier](https://github.com/mentum/superbowl_notifier) (Used Lawgs to log high-volume tweets)
