import NodeMediaServer from 'node-media-server';
import path from 'path';
import Bot from '../src/bot';
import { ClanApplication } from '../src/entities/clan-application';

const nms = new NodeMediaServer({
  logType: 0,
  rtmp: {
    port: 8000,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },
  http: {
    port: 8001,
    allow_origin: '*',
    mediaroot: path.join(__dirname, '../assets/livestream'),
  },
  trans: {
    ffmpeg: '/usr/bin/ffmpeg', // make sure ffmpeg is in PATH
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=30:hls_flags=delete_segments]',
        dash: false,
        ac: 'aac',
      },
    ],
  },
});

Bot.initializeDataSource().then(() => {
  nms.run();

  nms.on('prePublish', async (id, path, args) => {
    const streamKey = path.split('/').pop();
    const repo = Bot.dataSource.getRepository(ClanApplication);
    const app = await repo.findOne({ where: { streamKey } });

    if (!app) {
    //   console.log(`[NodeMediaServer] Stream key ${streamKey} not found. Rejecting...`);
      const session = nms.getSession(id);
      (session as any).reject('Invalid stream key. Please set one using /set-stream-key in your ticket in our discord.');
      return;
    }

    console.log(`[NodeMediaServer] Stream ${streamKey} is starting...`);
  });

  nms.on('donePublish', (id, streamPath, args) => {
    // console.log(`[NodeMediaServer] Stream ${streamPath} has ended.`);
  });
})