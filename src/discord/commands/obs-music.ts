import { ChatInputCommandInteraction, GuildBasedChannel, TextChannel, User, VoiceChannel } from "discord.js";
import Variables from "../../variables";
import Discord from "../discord";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, demuxProbe, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { PassThrough, Readable } from "stream";
import { ChildProcess, spawn } from "child_process";
import Bot from "../../bot";
import { ClanApplication } from "../../entities/clan-application";
import { RadioBot } from "../../entities/radio-bot";

export type Radio = {
    userId: string
    passThrough: PassThrough
    connection: VoiceConnection | null
    ffmpegProcess: ChildProcess | null
    restarting: boolean
}

export default class ObsMusic {
    public static radios: Record<string, Radio> = {}
    
    public static main = async (interaction: ChatInputCommandInteraction, update = false) => {
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
            await interaction.editReply(`❌ Radio is already used by <@${this.radios[discordRadio.token].userId}>.`)
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
            passThrough: new PassThrough(),
            ffmpegProcess: null,
            restarting: false
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
        await entersState(radio.connection!, VoiceConnectionStatus.Ready, 30000);
        const createPCMStream = async (radio: typeof ObsMusic['radios'][number], rtmpUrl: string): Promise<AudioResource> => {
            if (radio.ffmpegProcess) {
                radio.ffmpegProcess.removeAllListeners()
                if (!radio.ffmpegProcess.kill()) {
                    throw new Error(`Could not kill radio ffmpeg process.`)
                }
            }
            if (radio.passThrough) {
                try {
                    radio.passThrough?.destroy()
                } catch(err) {}
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
            radio.passThrough = new PassThrough()
            radio.ffmpegProcess.stdout!.pipe(radio.passThrough);
            radio.ffmpegProcess.on('close', async(code) => {
                console.log('FFmpeg exited with code', code)
                radio.connection?.destroy()
                radio.passThrough?.destroy()
                radio.ffmpegProcess?.removeAllListeners()
                radio.ffmpegProcess?.kill('SIGKILL')
                await channel.send(`OBS audio exited with code: ${code}`)
            });
            radio.ffmpegProcess.on('error', code => console.log(code))
            const { stream, type } = await demuxProbe(radio.passThrough)
            return createAudioResource(stream, {
                inputType: type
            })
        }
        const opus = await createPCMStream(radio, `rtmp://hurx.io:8000/live/${streamKey}`)
        const player = createAudioPlayer()
        radio.connection!.subscribe(player)
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
        player.on(AudioPlayerStatus.Idle, async() => {
            if (radio.restarting) return
            radio.restarting = true
            try {
                console.log('Idle, restarting');

                const retryDelay = 5000; // 5 seconds

                const resource = await createPCMStream(radio, `rtmp://hurx.io:8000/live/${streamKey}`);
                player.play(resource);
                if (resource.ended) {
                    await new Promise(res => setTimeout(res, retryDelay));
                }
                else {
                    return
                }

                // Cleanup
                radio.ffmpegProcess?.removeAllListeners()
                radio.ffmpegProcess?.kill('SIGKILL')
                radio.connection?.destroy()
                radio.passThrough.destroy()
            }
            catch (err) {
                console.error(`Restart failed`, err)
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
            radio.connection?.destroy()
            radio.passThrough.destroy()
            await channel.send(`OBS audio player exited with code: ${error.message}`)
        });
        player.play(opus)
        const notiChannel = await Discord.client.channels.fetch("1419466761199292476") as TextChannel
        if (!notiChannel) {
            await interaction.editReply('❌ No streamers channel to broadcast stream')
            return
        }
        if (!update) {
            await notiChannel.send(`Hey <@&1422230444115755214>, <@${member.id}> is now live in the <#${channel.id}> channel, enjoy!\n\nIt is possible to use the voice channel's chat as stream chat and it is possible to tune in, but if you want to chill with us you will have to join the clan! :)`)
        }
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