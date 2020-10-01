import parseEnvironment from './options.js';

function onException (e) {
  process.stderr.write(`${e.stack || e}\n`);
  process.exit(1);
}

function onSignal () {
  process.exit(0);
}

export default async function (bridgeClass, startServer) {
  process.on('uncaughtException', onException);
  process.on('unhandledRejection', onException);
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const config = parseEnvironment();
  const bridge = new bridgeClass(config);
  await startServer(bridge, config);

  await bridge.init();
}
