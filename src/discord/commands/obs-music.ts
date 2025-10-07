import { ChatInputCommandInteraction, GuildBasedChannel, TextChannel, User, VoiceChannel } from "discord.js";
import Variables from "../../variables";
import Discord from "../discord";
import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, demuxProbe, entersState, joinVoiceChannel, StreamType, VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { PassThrough, Readable } from "stream";
import { spawn } from "child_process";
import Bot from "../../bot";
import { ClanApplication } from "../../entities/clan-application";
import { RadioBot } from "../../entities/radio-bot";

export type Radio = {
    userId: string
    passThrough: PassThrough
    connection: VoiceConnection | null
}

export default class ObsMusic {
    public static radios: Record<string, Radio> = {}
    
    public static main = async (interaction: ChatInputCommandInteraction) => {
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
        const discordRadio = Discord.radios[radioEntity.token]
        if (!discordRadio) {
            await interaction.editReply('❌ Radio bot not registered.')
            return
        }
        if (discordRadio.token !== radioEntity.token) {
            await interaction.editReply('❌ Wrong radio bot, sorry.')
            return
        }
        console.log('TOKEN: ' + discordRadio.token)
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
            passThrough: new PassThrough()
        }
        const radio = this.radios[discordRadio.token]
        await entersState(radio.connection!, VoiceConnectionStatus.Ready, 30000);
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
            ffmpeg.stdout.pipe(radio.passThrough);
            ffmpeg.on('close', code => console.log('FFmpeg exited with code', code));
            ffmpeg.on('error', code => console.log(code))
            const { stream, type } = await demuxProbe(radio.passThrough)
            return createAudioResource(stream, {
                inputType: type
            })
        }
        const opus = await createPCMStream(`rtmp://hurx.io:8000/live/${streamKey}`)
        const player = createAudioPlayer({
            debug: true
        })
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
        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Idle')
        })
        player.on('error', error => console.error(error));
        player.play(opus)
        const notiChannel = await guild.channels.fetch("1419466761199292476") as TextChannel
        if (!notiChannel) {
            await interaction.editReply('❌ No streamers channel to broadcast stream')
            return
        }
        // await notiChannel.send(`Hey <@&1422230444115755214>, <@${member.id}> is now live in the <#${channel.id}> channel, enjoy!\n\nIt is possible to use the voice channel's chat as stream chat and it is possible to tune in, but if you want to chill with us you will have to join the clan! :)`)
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