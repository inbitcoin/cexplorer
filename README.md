# Colored Coins Block-Explorer

> The Colored Coins Block-Explorer

## Requirements

1. Bitcoin Core that runs as an RPC server with `-txindex=1`
2. MongoDB
3. The size of the data in the DB depends on `start_block`

## Configuring

On a first run, copy [`config/properties.sample.conf`](config/properties.sample.conf) as
`config/properties.conf` and edit the configuration parameters according to your needs.

Through environment variables it's possible to override configuration parameters.
Set `NODE_ENV` to `production` or `development` to change the environment in which cexplorer
should run.

## Installing and running

To install and run the service, execute:

```bash
$ npm install
$ NODE_ENV=production npm start
```

A Dockerfile based on Debian Stretch is available.
To build and run a docker image of cexplorer, run:

```bash
$ docker build -f docker/Dockerfile -t cexplorer .
$ docker run --rm -p 8081:8081 --env NODE_ENV=production \
  -v $(pwd)/config/properties.conf:/srv/app/cexplorer/config/properties.conf \
  cexplorer
```

## License

This software is licensed under the Apache License, Version 2.0.
See [LICENSE](LICENSE) for the full license text.
