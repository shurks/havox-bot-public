import NodeMediaServer from 'node-media-server';
import path from 'path';
import Bot from '../src/bot';
import { ClanApplication } from '../src/entities/clan-application';

const nms = new NodeMediaServer({
  logType: 2,
  rtmp: {
    port: 8000,
    chunk_size: 4096,
    gop_cache: false,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8001,
    allow_origin: '*',
    mediaroot: path.join(__dirname, '../assets/livestream'),
  },
  trans: {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        // hls: true,
        // hlsFlags: '[hls_time=2:hls_list_size=30:hls_flags=delete_segments]',
        dash: false,
        ac: 'aac',
      },
    ],
  },
});

Bot.initializeDataSource().then(() => {
  nms.run();

  nms.on('prePublish', async (id, streamPath, args) => {
    const streamKey = streamPath.split('/').pop();
    const repo = Bot.dataSource.getRepository(ClanApplication);
    const app = await repo.findOne({ where: { streamKey } });

    if (!app) {
      console.log(`[NodeMediaServer] Invalid stream key "${streamKey}". Rejecting...`);
      const session = nms.getSession(id);
		(session as any).reject('Invalid stream key. Please use /set-stream-key command.');
      return;
    }

    console.log(`[NodeMediaServer] Stream "${streamKey}" is starting...`);
  });

  nms.on('donePublish', (id, streamPath, args) => {
    console.log(`[NodeMediaServer] Stream "${streamPath}" has ended.`);
  });
});

setInterval(() => {
  const mem = process.memoryUsage().rss / 1024 / 1024;
  if (mem > 1000) {
    console.warn(`[NMS] High memory usage (${mem.toFixed(0)} MB) — restarting...`);
    process.exit(1);
  }
  console.log(`Memory: ${mem.toFixed(0)} MB`)
}, 60000);