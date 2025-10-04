import { spawn } from "child_process";
import NodeMediaServer from "node-media-server";
import path from "path";
import Discord from "../src/discord/discord";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, VoiceConnection } from "@discordjs/voice";
import Variables from "../src/variables";

const nms = new NodeMediaServer({
  logType: 3,
  rtmp: {
    port: 8000,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
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
      }
    ]
  }
})
nms.run()

nms.on('prePublish', function a (id, StreamPath, args) {
    console.log(`[NodeMediaServer] Stream ${StreamPath} is starting...`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log(`[NodeMediaServer] Stream ${StreamPath} has ended.`);
});