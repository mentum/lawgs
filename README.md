# Lawgs
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

Simply create your logger and you are ready to go.

```js
var logger  = lawgs.getOrCreate('SuperbowlLogs'); /* LogGroup */

logger.log('touchdown', { // or any serializable object
	team: 'Patriots',
	weight: 7
});
```

## Example
See ```example.js``` for a full working example.

## Contributing
Feel free to open issues and open pull requests.
