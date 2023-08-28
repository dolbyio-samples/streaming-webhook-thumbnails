const Config = require('config');
const Crypto = require('crypto');
const Express = require('express');
const Fs = require('fs');
const FsA = Fs.promises;
const Http = require('http');
const Os = require('os');
const Path = require('path');

const httpConfig = Config.util.toObject(Config.get('http'));
// remove null entries
Object.entries(httpConfig).forEach(([ key, val ]) => val === null ? delete httpConfig[key] : null);

let thumbnailDir = Config.get('millicast.thumbnailDir');
if (!thumbnailDir) {
  thumbnailDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'webhook-thumbnails_'));
}
const webhookSecret = Buffer.from(Config.get('millicast.webhookSecret'), 'base64');

async function mainAsync() {
  const httpServer = Http.createServer();

  httpServer.on('error', (err) => {
    console.error(`Http server error. ${err.stack}`);
    gracefulExit('HTTP_ERROR');
  });

  const expressApp = new Express();
  httpServer.addListener('request', /** @type{RequestListener} */expressApp);

  expressApp.use((req, res, _next) => {
    const now = new Date();
    const isThumbnail = req.is('image/jpeg');
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      if (!isThumbnail) {
        res
          .status(400)
          .send('Invalid content!');
        return;
      }

      const body = Buffer.concat(chunks);

      const calculatedSignature = 'sha1=' + Crypto.createHmac('sha1', webhookSecret).update(body).digest('hex');
      const headerSignature = req.get('X-Millicast-Signature');

      if (calculatedSignature !== headerSignature) {
        console.warn(`Invalid signature - received: ${headerSignature} - calculated: ${calculatedSignature}.`);
        res
          .status(400)
          .send('Invalid signature!');
        return;
      }

      const thumbTimestamp = req.get('X-Millicast-Timestamp');
      const thumbFeedId = req.get('X-Millicast-Feed-Id');
      const thumbStreamId = req.get('X-Millicast-Stream-Id');
      console.log(
        `DeliveredOn: ${now.toISOString()}. ` +
        `GeneratedOn: ${new Date(thumbTimestamp).toISOString()}. ` +
        `FeedId: ${thumbFeedId}. ` +
        `StreamId: ${thumbStreamId}. ` +
        `ThumbnailSize: ${body.length}`
      );
      
      await FsA.writeFile(Path.join(thumbnailDir, `${thumbFeedId}_${thumbTimestamp}.jpg`), body);

      res.status(200).send('OK');
    });
  });

  httpServer.listen(httpConfig, () => {
    console.log('Server listening');
  });

  function gracefulExit(signal) {
    console.log(`Shutting down server from: ${signal}`);

    httpServer.close(() => {
      console.log('Http server shutdown');
      socketCleanup();
    });
  }

  /** @type{Signals[]} */
  const stopSignals = [ 'SIGINT', 'SIGTERM', 'SIGQUIT' ];
  stopSignals.forEach((signal) => process.on(signal, () => gracefulExit(signal)));
}

function socketCleanup() {
  if (httpConfig.path) {
    try {
      Fs.unlinkSync(httpConfig.path);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // ignore if file does not exist
        return;
      }
      console.error(`Error cleaning up unix socket: ${err.stack}`);
    }
  }
}

mainAsync()
  .catch((err) => {
    console.error(err.stack);
  });
