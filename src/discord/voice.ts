import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, demuxProbe, joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice"
import { ChildProcess, execSync, spawn } from "child_process"
import { PassThrough } from "stream"
import Discord from "./discord"
import Variables from "../variables"
import { GuildBasedChannel, VoiceChannel, VoiceConnectionStates } from "discord.js"
import Bot from "../bot"
import { ClanApplication } from "../entities/clan-application"
import { RadioBot } from "../entities/radio-bot"

export type Stream = {
    userId: string
    passThrough: PassThrough | null
    connection: VoiceConnection | null
    ffmpegProcess: ChildProcess | null
    twitchProcess: ChildProcess | null
    player: AudioPlayer
}

/**
 * Utility class for all voice related things in discord
 */
export default class Voice {
    public static streams: Record<string, Stream> = {}
    /**
     * Opens a RTMP stream
     * @param streamKey the stream key to open stream for
     */
    public static openStream = async(streamKey: string) => {
        let guild = Discord.client.guilds.cache.find(guild => guild.id === Variables.var.Guild)
        if (!guild) {
            console.error('No guild.')
            return '❌ The guild does not exist.'
        }
        const clanAppRepo = Bot.dataSource.getRepository(ClanApplication)
        const clanApp = await clanAppRepo.findOne({
            where: {
                streamKey
            }
        })
        if (!clanApp) {
            console.error('No stream key.')
            return '❌ Stream key does not exist'
        }
        // Find voice channel
        const member = await guild.members.fetch(clanApp.userId)
        const radioBotRepo = Bot.dataSource.getRepository(RadioBot)
        const users = await radioBotRepo.find({
            where: {
                userId: clanApp.userId
            }
        })
        for (const user of users) {
            await this.closeStream(user.token)
            user.userId = null
            await radioBotRepo.save(user)
        }
        if (!member) {
            console.error('No member.')
            return '❌ User is not in the discord'
        }
        if (!member.voice.channelId) {
            console.error('No channel id.')
            return `❌ <@${member.user.id}> is not in this voice channel.`
        }
        let channel = await guild.channels.fetch(member.voice.channelId)
        // Find bot
        if (!channel) {
            console.error('User not in voice channel.')
            return '❌ User is not in voice channel'
        }
        const radioBot = await radioBotRepo.findOne({
            where: {
                channel: channel.id
            }
        })
        if (!radioBot) {
            console.error(`No bot registered in channel "${channel.name}"`)
            return `❌ No bot registered in channel <#${channel.id}>`
        }
        const token = radioBot.token
        if (this.streams[token]) {
            if (this.streams[token]?.connection?.state.status === VoiceConnectionStatus.Ready) {
                return `❌ Stream is still functional`
            }
            if (!(await this.closeStream(token))) {
                console.error(`Could not close stream for channel "${channel.name}"`)
                return `❌ Could not close stream for channel <#${channel.id}>`
            }
        }
        const radio = Discord.radios[token]
        if (!radio) {
            console.error(`No bot registered in Discord.radios for channel "${channel.name}"`)
            return `❌ No bot registered in Discord.radios for channel <#${channel.id}>`
        }
        guild = await radio.guilds.fetch(Variables.var.Guild)
        if (!guild) {
            console.error('Bot is not in guild.')
            return '❌ The bot is not in the guild.'
        }
        channel = await guild.channels.fetch(channel.id) as VoiceChannel
        if (!channel) {
            console.error('Bot has no access to voice channel.')
            return '❌ Bot has no access to voice channel.'
        }
        radioBot.userId = clanApp.userId
        await radioBotRepo.save(radioBot)
        const connection = await this.connectToVoice(token)
        if (typeof connection === 'string') {
            return connection
        }
        const twitch = (radioBot.channel === '1419097763286880449')
        // const twitchProcess = twitch ? spawn('ffmpeg', [
        //     '-re',
        //     '-i', `rtmp://127.0.0.1:8000/live/${streamKey}`,
        //     '-reconnect', '1',
        //     '-reconnect_streamed', '1',
        //     '-reconnect_delay_max', '5',
        //     '-c:v', 'libx264',   // re-encode video to H.264
        //     '-preset', 'veryfast',
        //     '-b:v', '2500k',
        //     '-c:a', 'aac',       // re-encode audio to AAC
        //     '-b:a', '160k',
        //     '-f', 'flv',
        //     'rtmp://lhr03.contribute.live-video.net/app/' + streamKey
        // ]) : null
        const ffmpegProcess = spawn('ffmpeg', [
            '-re',
            '-i', `rtmp://127.0.0.1:8000/live/${streamKey}`,
            '-reconnect', '1',
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '5',
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
        const passThrough = new PassThrough()
        ffmpegProcess.stdout.pipe(passThrough)
        ffmpegProcess.on('close', async(code) => {
            console.log('FFmpeg exited with code', code)
            await this.closeStream(token)
        })
        const twitchProcess: ChildProcess = null as any
        twitchProcess?.on('close', async(code) => {
            console.log('Twitch exited with code', code)
            await this.closeStream(token)
        })
        ffmpegProcess.stderr?.on('data', (chunk) => {
            const text = chunk.toString();
            // Only log if it’s an actual error, not the progress info
            if (/^Error|Invalid|failed/i.test(text)) {
                console.log(text);
            }
        })
        const { stream, type } = await demuxProbe(passThrough)
        const audioResource = createAudioResource(stream, {
            inputType: type
        })
        const player = createAudioPlayer()
        connection.subscribe(player)
        player.on(AudioPlayerStatus.Playing, () => {
            console.log('Streaming RTMP audio into Discord!');
            channel.send(`✅ Playing OBS audio output for user <@${member.id}> as music`)
        });
        player.on(AudioPlayerStatus.AutoPaused, (a, b) => {
            console.log('Autopaused')
            player.unpause()
        })
        player.on(AudioPlayerStatus.Buffering, () => {
            console.log('Buffering')
        })
        player.on('error', async (error) => {
            await this.closeStream(token)
            console.error(error)
            await channel.send(`❌ OBS audio player exited with code: ${error.message}`)
        })
        player.play(audioResource)
        this.streams[token] = {
            userId: member.user.id,
            passThrough,
            connection,
            ffmpegProcess,
            twitchProcess,
            player
        }
    }
    /**
     * Closes a RTMP stream
     * @param token the token of the bot to close the stream for
     */
    public static closeStream = async(token: string) => {
        const radio = Discord.radios[token]
        if (!radio) {
            console.error(`No bot registered in Discord.radios for token "${token}"`)
            return false
        }
        const stream = Voice.streams[token]
        if (stream) {
            if (stream.twitchProcess?.connected) {
                if (stream.twitchProcess.pid) {
                    try {
                        const output = execSync(`kill ${stream.twitchProcess.pid}`, { encoding: 'utf-8' });
                        console.log(`Killed twitch process`, output)
                    }
                    catch (err) {}
                }
            }
            if (stream.ffmpegProcess && stream.ffmpegProcess.connected) {
                if (stream.ffmpegProcess.pid) {
                    try {
                        const output = execSync(`kill ${stream.ffmpegProcess.pid}`, { encoding: 'utf-8' });
                        console.log(`Killed ffmpeg process`, output)
                    }
                    catch (err) {}
                }
            }
            if (stream.passThrough && !stream.passThrough.destroyed) {
                try {
                    stream.passThrough.destroy()
                }
                catch (err) {
                    console.error(`Could not destroy passthrough for bot with token "${token}"`, err)
                }
            }
        }
        await this.disconnectFromVoice(token)
        delete Voice.streams[token]
        return true
    }
    /**
     * Connects a bot to voice
     * @param token token of the bot to connect with
     */
    public static connectToVoice = async(token: string) => {
        const radio = Discord.radios[token]
        if (!radio?.user?.id?.length) {
            console.error('No radio.')
            return '❌ The Discord does not have a radio for this bot.'
        }
        let guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        if (!guild) {
            console.error('No guild.')
            return '❌ The guild does not exist.'
        }
        const botRepo = Bot.dataSource.getRepository(RadioBot)
        const bot = await botRepo.findOne({
            where: {
                token
            }
        })
        if (!bot) {
            console.error('Invalid token.')
            return '❌ The token does not exist.'
        }
        if (!bot.userId) {
            console.error(`Bot is not assigned to a user.`)
            return `❌ The music bot is not assigned to a user.`
        }
        // Find voice channel
        const member = await guild.members.fetch(bot.userId)
        if (!member) {
            console.error('No member.')
            return '❌ User is not in the discord'
        }
        if (!member.voice.channelId) {
            console.error('No channel id.')
            return '❌ The user is not in a voice chat channel.'
        }
        const channel = await guild.channels.fetch(member.voice.channelId)
        // Find bot
        if (!channel) {
            console.error('Connect: User not in voice channel.')
            return '❌ Connect: User is not in voice channel'
        }
        const radioGuild = await radio.guilds.fetch(guild.id)
        if (!radioGuild){ 
            console.error('No guild.')
            return '❌ The radio bot is not in guild.'
        }
        return joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: radioGuild.voiceAdapterCreator,
            group: channel.id
        })
    }
    /**
     * Disconnects a bot from voice
     * @param token token of the bot to disconnect
     */
    public static disconnectFromVoice = async(token: string) => {
        const disconnected = Boolean(Voice.streams[token]?.connection?.disconnect())
        if (!disconnected) {
            console.error('Could not disconnect from voice channel')
            return '❌ Could not disconnect from voice channel'
        }
        else {
            console.error('Disconnected from voice channel')
            return '✅ Disconnected from voice channel'
        }
    }
}