import { ChatInputCommandInteraction, User, VoiceChannel } from "discord.js";
import Variables from "../../variables";
import Discord from "../discord";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, demuxProbe, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { PassThrough, Readable } from "stream";
import { spawn } from "child_process";
import Bot from "../../bot";
import { ClanApplication } from "../../entities/clan-application";

export default class ObsMusic {
    public static passThrough = new PassThrough()

    public static connection: VoiceConnection | null = null
    
    public static main = async (interaction: ChatInputCommandInteraction) => {
        const guild = Discord.client.guilds.cache.find(guild => guild.id === Variables.var.Guild)
        if (!guild) {
            console.error('No guild.')
            await interaction.editReply('❌ The guild does not exist.')
            return
        }
        const channel = await guild.channels.fetch(interaction.channelId) as VoiceChannel
        if (!(channel instanceof VoiceChannel)) {
            await interaction.editReply('❌ This is not a music channel.')
            return
        }
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const apps = await repo.find({
            where: {
                userId: interaction.user.id
            }
        })
        const member = await interaction.guild?.members.fetch(interaction.user.id)
        if (!member) {
            await interaction.editReply('❌ You\'re not in the discord.')
            return
        }
        if (!member.roles.cache.has(Variables.var.StaffRole)) {
            await interaction.editReply('❌ You need to be staff to use this command, sorry :).')
            return
        }
        let streamKey = ''
        for (const app of apps) {
            if (app.streamKey) {
                streamKey = app.streamKey
                break
            }
        }
        if (!streamKey.length) {
            await interaction.editReply('❌ No stream key found, you can set it with `/set-stream-key`')
            return
        }
        ObsMusic.passThrough = new PassThrough()
        if (this.connection) {
            this.connection.destroy()
        }
        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator
        })
        this.connection.on('stateChange', (state) => {
            console.log(`State: ${state.status}`)
        })
        await entersState(this.connection, VoiceConnectionStatus.Ready, 30000);
        const createPCMStream = async (rtmpUrl: string): Promise<AudioResource> => {
                const ffmpeg = spawn('ffmpeg', [
                '-re',
                '-i', rtmpUrl,
                '-acodec',
                'libopus',
                '-f',
                'opus',
                '-ar',
                '48000',
                '-ac',
                '2',
                'pipe:1'
            ], { stdio: ['ignore', 'pipe', 'pipe'] });
            ffmpeg.stdout.pipe(this.passThrough);
            ffmpeg.stderr.on('data', chunk => console.error('FFmpeg error:', chunk.toString()));
            ffmpeg.on('close', code => console.log('FFmpeg exited with code', code));
            ffmpeg.on('error', code => console.log(code))
            const { stream, type } = await demuxProbe(this.passThrough)
            return createAudioResource(stream, {
                inputType: type
            })
        }
        const opus = await createPCMStream(`rtmp://hurx.io:8000/live/${streamKey}`)
        const player = createAudioPlayer()
        this.connection.subscribe(player)
        player.on(AudioPlayerStatus.Playing, () => {
            console.log('Streaming RTMP audio into Discord!');
        });
        player.on(AudioPlayerStatus.AutoPaused, (a, b) => {
            console.log('Autopaused')
            player.unpause()
        })
        player.on(AudioPlayerStatus.Buffering, () => {
            console.log('Buffering')
        })
        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Idle')
        })
        player.on('error', error => console.error(error));
        player.play(opus)
        this.connection.subscribe(player)
        await interaction.editReply('✅ Invited')
    }

    public static setStreamKey = async (interaction: ChatInputCommandInteraction) => {
        const guild = Discord.client.guilds.cache.find(guild => guild.id === Variables.var.Guild)
        if (!guild) {
            console.error('No guild.')
            await interaction.editReply('❌ The guild does not exist.')
            return
        }
        const channel = await guild.channels.fetch(interaction.channelId) as VoiceChannel
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const channelApp = await repo.find({
            where: {
                channel: channel.id
            }
        })
        if (!channelApp.length) {
            await interaction.editReply('❌ Only use this command in your ticket.')
            return
        }
        const apps = await repo.find({
            where: {
                userId: interaction.user.id
            }
        })
        for (const app of apps) {
            app.streamKey = interaction.options.getString('key')
            await repo.save(app)
        } 
        await interaction.editReply('✅ Stream key set')
    }
}