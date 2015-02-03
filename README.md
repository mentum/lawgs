# Lawgs
Nodejs logging to CloudWatch Logs made easy

## Features
- Creates Log Groups automatically
- Creates Log Streams automatically
- Periodic upload
- Automatic logs batching
- JSON logging support
- loggers instances are shared accross modules

## Get it
``` npm install lawgs ```

## How to use it

The only required configurations are the AWS configurations.

```js
var lawgs = require('./index');

lawgs.config({
	aws: {
		accessKeyId: '********', /* Optional is credentials are set in ~/.aws/credentials */
		secretAccessKey: '******', /* Optional */
		region: 'us-east-1' /* Required */
	}
});
```

Create a logger, then you are ready to go.

```js
var logger  = lawgs.getOrCreate('SuperbowlLogs'); /* LogGroup */

logger.log('touchdown', { // or any serializable object
	team: 'Patriots',
	weight: 7
});
```

## Example
See ```example.js``` for a full working example

## Contributing
Please feel free to open issues and to make pull requests.
