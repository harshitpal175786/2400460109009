# Logging Middleware

Reusable Affordmed logging package.

## Setup

Create an environment file in the project that consumes this package:

```env
ACCESS_TOKEN=<affordmed_access_token>
LOG_API_URL=http://4.224.186.213/evaluation-service/logs
```

## Usage

```js
const { Log } = require("../logging_middleware");

await Log("backend", "info", "service", "notification fetch started");
```

The function validates `stack`, `level`, and `package` before calling the
protected Affordmed Log API.
