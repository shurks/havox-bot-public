import { ChatInputCommandInteraction, Guild, GuildBasedChannel, TextChannel, User, VoiceChannel } from "discord.js";
import Variables from "../../variables";
import Discord from "../discord";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, demuxProbe, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { PassThrough, Readable } from "stream";
import { ChildProcess, spawn } from "child_process";
import Bot from "../../bot";
import { ClanApplication } from "../../entities/clan-application";
import { RadioBot } from "../../entities/radio-bot";
import { rejects } from "assert";

export type Radio = {
    userId: string
    passThrough: PassThrough | null
    connection: VoiceConnection | null
    ffmpegProcess: ChildProcess | null
    restarting: boolean
    size: number
}

export default class ObsMusic {
    public static radios: Record<string, Radio> = {}
    
    public static connect = async (interaction: ChatInputCommandInteraction, update = false) => {
        let guild = Discord.client.guilds.cache.find(guild => guild.id === Variables.var.Guild)
        if (!guild) {
            console.error('No guild.')
            await interaction.editReply('❌ The guild does not exist.')
            return
        }
        let channel: GuildBasedChannel | null = await guild.channels.fetch(interaction.channelId) as VoiceChannel
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
        const radioRepo = Bot.dataSource.getRepository(RadioBot)
        const radioEntity = await radioRepo.findOne({
            where: {
                channel: interaction.channelId
            }
        })
        if (!radioEntity) {
            await interaction.editReply('❌ No radio bot found for this voice channel, register it in the database.')
            return
        }
        radioEntity.userId = member.user.id
        await radioRepo.save(radioEntity)
        const discordRadio = Discord.radios[radioEntity.token]
        if (!discordRadio) {
            await interaction.editReply('❌ Radio bot not registered.')
            return
        }
        if (discordRadio.token !== radioEntity.token) {
            await interaction.editReply('❌ Wrong radio bot, sorry.')
            return
        }
        guild = await discordRadio.guilds.fetch(Variables.var.Guild)
        channel = await guild.channels.fetch(channel.id) as VoiceChannel
        if (!channel) {
            await interaction.editReply('❌ Radio bot has no access to channel.')
            return
        }
        if (this.radios[discordRadio.token]) {
            const radio = this.radios[discordRadio.token]!
            try {
                radio.connection?.destroy()
            } catch (err) {
                await interaction.editReply(`❌ Could not destroy previous connection: ${err}`)
            }
            try {
                radio.passThrough?.destroy()   
            }
            catch (err) {
                await interaction.editReply(`❌ Could not destroy previous pass through: ${err}`)
            }
            try {
                radio.ffmpegProcess?.removeAllListeners()
                radio.ffmpegProcess?.kill()
            }
            catch (err) {
                await interaction.editReply(`❌ Could not kill ffmpeg process from previous: ${err}`)
            }
            return
        }
        this.radios[discordRadio.token] = {
            userId: interaction.user.id,
            connection: joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                group: channel.id
            }),
            passThrough: null,
            ffmpegProcess: null,
            restarting: false,
            size: 0
        }
        const radio = this.radios[discordRadio.token]
        radio.connection!.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            console.log('Disconnected, attempting reconnect...');
            try {
                await entersState(radio.connection!, VoiceConnectionStatus.Signalling, 5000);
                await entersState(radio.connection!, VoiceConnectionStatus.Connecting, 5000);
            } catch {
                console.log('Reconnecting failed, destroying connection...');
                radio.connection!.destroy();
            }
        });
        radio.connection!.on('error', console.error)
        await entersState(radio.connection!, VoiceConnectionStatus.Ready, 30000);
        // const notiChannel = await Discord.client.channels.fetch("1419466761199292476") as TextChannel
        // if (!notiChannel) {
        //     await interaction.editReply('❌ No streamers channel to broadcast stream')
        //     return
        // }
        // if (!update) {
        //     await notiChannel.send(`Hey <@&1422230444115755214>, <@${member.id}> is now live in the <#${channel.id}> channel, enjoy!\n\nIt is possible to use the voice channel's chat as stream chat and it is possible to tune in, but if you want to chill with us you will have to join the clan! :)`)
        // }
        await interaction.editReply('✅ Invited')
        return {radio, channel, discordRadio, radioEntity, streamKey}
    }

    public static setResource = async(interaction: {
        guild: Guild,
        channelId: string,
        user: {
            id: string
        },
        editReply: (msg: string) => Promise<any>
    }): Promise<string> => {
        const connect = await this.connect(interaction as any)
        if (!connect) {
            return `❌ Could not connect the bot to the voice channel`
        }
        const {radio, channel, discordRadio, radioEntity, streamKey} = connect
        const createPCMStream = async (radio: typeof ObsMusic['radios'][number], rtmpUrl: string): Promise<AudioResource> => {
            console.log('PCM stream start')
            if (radio.ffmpegProcess && !radio.ffmpegProcess.killed) {
                radio.ffmpegProcess.removeAllListeners()
                radio.ffmpegProcess.kill()
                if (!radio.ffmpegProcess.killed) {
                    return await createPCMStream(radio, rtmpUrl)
                }
                radio.ffmpegProcess = null
            }
            radio.ffmpegProcess = spawn('ffmpeg', [
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
            radio.passThrough = radio.passThrough || new PassThrough()
            radio.ffmpegProcess.stdout!.pipe(radio.passThrough)
            radio.ffmpegProcess.on('close', async(code) => {
                console.log('FFmpeg exited with code', code)
                try { radio.connection?.destroy() } catch(err) {}
                radio.ffmpegProcess?.removeAllListeners()
                radio.ffmpegProcess?.kill('SIGKILL')
                await channel.send(`OBS audio exited with code: ${code}`)
                delete this.radios[discordRadio.token!]
            });
            radio.ffmpegProcess.stderr?.on('data', (chunk) => {
                const text = chunk.toString();
                // Only log if it’s an actual error, not the progress info
                if (/^Error|Invalid|failed/i.test(text)) {
                    console.log(text);
                }
            })
            radio.ffmpegProcess.on('error', code => console.log(code))
            try {
                const { stream, type } = await Promise.race([
                    demuxProbe(radio.passThrough),
                    new Promise<{stream: Readable, type: StreamType}>((_, reject) => {
                        setTimeout(() => reject(new Error(`❌ Stream for user <@${interaction.user.id}> is not live yet, could not load it.`)), 60000)
                    })
                ])
                return createAudioResource(stream, {
                    inputType: type
                })
            }
            catch (err) {
                try { radio.connection?.destroy() } catch(err) {}
                radio.ffmpegProcess?.removeAllListeners()
                radio.ffmpegProcess?.kill('SIGKILL')
                await channel.send((err as any).message)
                const guild = await discordRadio.guilds.fetch(Variables.var.Guild)
                if (guild && discordRadio.user?.id?.length) {
                    const member = await guild.members.fetch(discordRadio.user.id)
                    if (member) {
                        member.voice.disconnect()
                    }
                }
                throw err
            }
        }
        const player = createAudioPlayer()
        radio.connection!.subscribe(player)
        player.on(AudioPlayerStatus.Playing, () => {
            console.log('Streaming RTMP audio into Discord!');
            channel.send(`✅ Playing OBS audio output for user <@${radio.userId}> as music`)
        });
        player.on(AudioPlayerStatus.AutoPaused, (a, b) => {
            console.log('Autopaused')
            player.unpause()
        })
        player.on(AudioPlayerStatus.Buffering, () => {
            console.log('Buffering')
        })
        player.on(AudioPlayerStatus.Idle, async() => {
            if (radio.restarting) return
            radio.restarting = true
            try {
                console.log('Idle, restarting');

                // Restart
                const resource = await createPCMStream(radio, `rtmp://127.0.0.1:8000/live/${streamKey}`);
                player.play(resource);
            }
            catch (err) {
                console.error(`Restart failed`, err)
                delete this.radios[radioEntity.token]
            }
            finally {
                radio.restarting = false
            }
        })
        player.on('error', async (error) => {
            console.error(error)
            // Cleanup
            radio.ffmpegProcess?.removeAllListeners()
            radio.ffmpegProcess?.kill('SIGKILL')
            try { radio.connection?.destroy() } catch(err) {}
            await channel.send(`❌ OBS audio player exited with code: ${error.message}`)
        });
        try {
            const opus = await createPCMStream(radio, `rtmp://127.0.0.1:8000/live/${streamKey}`)
            player.play(opus)
            return `✅ Added resource`
        } catch(err) {
            console.error(`Failed to play stream`, err)
            delete this.radios[radioEntity.token]
            return `❌ Could not add resource`
        }
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
        const streamKey = interaction.options.getString('key')!
        const app = await repo.findOne({
            where: {
                streamKey
            }
        })
        if (app) {
            await interaction.editReply('❌ Stream key already in use, please be more creative.')
            return
        }
        const apps = await repo.find({
            where: {
                userId: interaction.user.id
            }
        })
        for (const app of apps) {
            app.streamKey = streamKey
            await repo.save(app)
        } 
        await interaction.editReply('✅ Stream key set')
    }
}