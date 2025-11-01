import dotenv from 'dotenv';
import Discord from './discord/discord';
import Twitch from './twitch/twitch';
import 'reflect-metadata'
import Database from './database';
import { DataSource, UsingJoinColumnOnlyOnOneSideAllowedError } from 'typeorm';
import { execSync } from 'child_process';
import path from 'path';
import ApproveTrialistTask from './discord/tasks/approve-trialist-task';
import SortRelationManager from './discord/tasks/sort-relation-manager';
import { readdirSync, readFileSync, rmSync } from 'fs';
import Variables from './variables';
import { Guild, GuildMember, PermissionFlagsBits, PermissionsBitField, REST, Routes, TextChannel, VoiceChannel, VoiceConnectionStates } from 'discord.js';
import ProcessAllMembersTask from './discord/tasks/process-all-members-task';
import { Metadata } from './entities/metadata';
import { RadioBot } from './entities/radio-bot';
import express, { Response } from 'express'
import { ClanApplication } from './entities/clan-application';
import { Server } from 'http';
import Voice from './discord/voice';
import { VoiceConnectionStatus } from '@discordjs/voice';
import GiveBackClanMemberRoleTask from './discord/tasks/give-back-clan-member-role-task';
import Stats from './discord/commands/stats';
dotenv.config();

process.on('SIGINT', () => {
    console.log('🛑 Caught SIGINT, shutting down gracefully...');
    Bot.running = false;
    if (Bot.sleep) {
        clearTimeout(Bot.sleep)
    }
    if (Bot.setResourceTimeOut) {
        clearTimeout(Bot.setResourceTimeOut)
    }
    Bot.server?.close()
    process.exit(0)
});

process.on('SIGTERM', () => {
    console.log('🛑 Caught SIGTERM, shutting down gracefully...');
    Bot.running = false;
    if (Bot.sleep) {
        clearTimeout(Bot.sleep)
    }
    if (Bot.setResourceTimeOut) {
        clearTimeout(Bot.setResourceTimeOut)
    }
    Bot.server?.close()
    process.exit(0)
});


export default class Bot {
    public static app: typeof express.application

    public static server: Server

    public static dataSource: DataSource

    public static setResourceTimeOut: NodeJS.Timeout | null = null

    public static closeStreamTimeOuts: Record<string, NodeJS.Timeout> = {}

    public static main = async (cron = false) => {
        console.log('Catching uncaught exceptions/rejections...')
        process.on('uncaughtException', err => {
            console.error('Uncaught Exception:', err);
            process.exit(1)
        });
        process.on('unhandledRejection', err => {
            console.error('Unhandled Rejection:', err);
            process.exit(1)
        });
        console.log('Initializing data source')
        await this.initializeDataSource()
        const repo = Bot.dataSource.getRepository(Metadata)
        const metadata = await repo.find()
        for (const m of metadata) {
            (Variables.env as any)[m.key] = m.value
        }
        console.log('Starting discord bot')
        await Discord.main(cron)
        if (!cron) {
            console.log('Starting discord radio bots')
            const botRepo = Bot.dataSource.getRepository(RadioBot)
            const bots = await botRepo.find()
            const requiredPermissions = new PermissionsBitField([
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.UseVAD,
            ]);
            for (const bot of bots) {
                const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
                await Discord.radioBot(bot.appId, bot.token)
                if (guild) {
                    const channel = await guild.channels.fetch(bot.channel) as VoiceChannel
                    if (channel) {
                        const radio = Discord.radios[bot.token]
                        if (radio.user) {
                            const user = await guild.members.fetch(radio.user.id)
                            if (user) {
                                const permissions = channel.permissionsFor(user.id)
                                const missing = requiredPermissions
                                    .toArray()
                                    .filter(perm => !permissions?.has(perm));
                                if (missing.length > 0) {
                                    await channel.permissionOverwrites.edit(user.id, Object.fromEntries(
                                        missing.map(perm => [perm, true])
                                    ))
                                }
                            }
                        }
                    }
                }
            }
            console.log('Starting twitch bot')
            await Twitch.main()
            console.log('Processing commits')
            await this.processCommits()
            console.log('Initializing express')
            this.initializeExpress()
        }
        else {
            console.log('Running cronjobs')
            this.runCronJobs()
        }
    }

    public static running = true

    public static sleep: any = null

    private static runCronJobs = async() => {
        let counter = 0
        let stats = 0
        const processAllMembers = async() => {
            console.log('Processing all members')
            await ProcessAllMembersTask.main()
            console.log('✅')
        }
        const processFrequent = async() => {
            console.log('Sorting categories')
            await SortRelationManager.main()
            console.log('Updating hall of fame')
            await Stats.updateHallOfFame()
            console.log('✅')
        }
        while (this.running) {
            if (counter % 5 === 0) {
                await processAllMembers()
                await processFrequent() 
            }
            if ((counter + 1) % 60 === 0) {
                console.log('Approving/declining trialists')
                await ApproveTrialistTask.main()
                console.log('✅')
            }
            if (counter % 1 === 0) {
                console.log('Giving back clan member role to those who don\'t have it anymore.')
                await GiveBackClanMemberRoleTask.main()
            }
            if (counter % 2 === 0) {
                const apps = await this.dataSource.getRepository(ClanApplication).find()
                let app = apps[stats]
                if (!app) {
                    stats = 0
                    app = apps[0]
                }
                stats++
                if (app.rsn) {
                    console.log(`Retrieving stats for user: "${app.rsn}"`)
                    await Stats.retrieve({
                        rsn: [app.rsn],
                        maxAgeMs: 1000 * 2 * 60
                    })
                }
            }
            console.log('✅')
            await new Promise<void>((res, rej) => {
                if (!this.sleep) {
                    this.sleep = setTimeout(() => {
                        this.sleep = null
                        res()
                    }, 1000 * 60)
                }
            })
            counter++
        }
    }

    public static initializeDataSource = async() => {
        console.log('Configuring database')
        try {
            // Create new migration, if applicable
            try {
                execSync("npx ts-node ./node_modules/typeorm/cli migration:generate src/migrations/migration -d src/database.ts", {
                    cwd: path.join(__dirname, '../'),
                    encoding: 'utf8'
                })
            }
            // New migration failed, as there are no changes
            catch (err) {
                console.log('No schema changes have been found.')
            }
            // Initialize
            this.dataSource = await Database.initialize()
        }
        catch (err) {
            throw err
        }
    }

    public static initializeExpress = async() => {
        const app = express();
        app.use(express.urlencoded({ extended: true })); // nginx sends x-www-form-urlencoded
        // Validate stream key before publishing
        app.post('/done', async(req, res) => {
            const streamKey = req.body.name
            console.log(`Streaming done for ${streamKey}`)

            if (this.closeStreamTimeOuts[streamKey]) {
                clearTimeout(this.closeStreamTimeOuts[streamKey])
            }

            this.closeStreamTimeOuts[streamKey] = setTimeout(async() => {
                const repo = Bot.dataSource.getRepository(ClanApplication);
                const appEntry = await repo.findOne({ where: { streamKey } });
                if (appEntry) {
                    const botRepo = Bot.dataSource.getRepository(RadioBot)
                    const bots = await botRepo.find({
                        where: {
                            userId: appEntry.userId
                        }
                    })
                    for (const bot of bots) {
                        bot.userId = null
                        await botRepo.save(bot)
                        await Voice.closeStream(bot.token)
                    }
                }
            }, 5000)
        })
        app.post('/validate_key', async (req, res) => {
            const streamKey = req.body.name; // 'name' = stream key from NGINX
            const repo = Bot.dataSource.getRepository(ClanApplication);
            const appEntry = await repo.findOne({ where: { streamKey } });

            if (this.closeStreamTimeOuts[streamKey]) {
                clearTimeout(this.closeStreamTimeOuts[streamKey])
                delete this.closeStreamTimeOuts[streamKey]
            }

            if (!appEntry) {
                console.log(`[RTMP] Validate: Rejected invalid stream key: ${streamKey}`);
                return res.status(403).send('Forbidden');
            }

            const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
            if (!guild) {
                console.log(`[RTMP] Validate: Guild does not exist. ("${streamKey}")`)
                return res.status(403).send('Forbidden');
            }

            const member = await guild.members.fetch(appEntry.userId)
            if (!member) {
                console.log(`[RTMP] Validate: Member is not in guild. ("${streamKey}")`)
                return res.status(403).send('Forbidden');
            }

            const repoRadio = Bot.dataSource.getRepository(RadioBot);
            let voiceChannel = member.voice.channel
            if (voiceChannel) {
                const voiceChannelEntry = await repoRadio.findOne({
                    where: {
                        channel: voiceChannel.id
                    }
                })
                if (!voiceChannelEntry) {
                    console.log(`[RTMP] Validate: There's no voice bot for this voice channel. ("${streamKey}`)
                    console.log({ channelID: voiceChannel.id })
                    return res.sendStatus(403)
                }
                if (voiceChannelEntry.userId) {
                    if (voiceChannelEntry.userId === member.id) {
                        console.log(`[RTMP] Validate: Voice channel bot is used by this user ("${streamKey}"), accepting.`)
                        res.on('finish', async () => {
                            console.log('Finish: Opening stream')
                            await Voice.openStream(streamKey)
                        })
                        return res.sendStatus(200)
                    }
                    else {
                        const otherMember = await guild.members.fetch(voiceChannelEntry.userId)
                        if (!otherMember || otherMember.voice?.channelId !== voiceChannelEntry.channel) {
                            console.log(`[RTMP] Validate: User playing the bot is no member or not in voice channel, accepting.`)
                            voiceChannelEntry.userId = member.id
                            await repoRadio.save(voiceChannelEntry)
                            res.on('finish', async () => {
                                console.log('Finish: Opening stream')
                                await Voice.openStream(streamKey)
                            })
                            return res.sendStatus(200)
                        }
                        return res.sendStatus(403)
                    }
                }
                else {
                    voiceChannelEntry.userId = member.id
                    await repoRadio.save(voiceChannelEntry)
                    console.log(`[RTMP] Validate: Voice channel bot is now used by user "${member.displayName}" ("${streamKey}"), accepting.`)
                    res.on('finish', async () => {
                        console.log('Finish: Opening stream')
                        await Voice.openStream(streamKey)
                    })
                    return res.sendStatus(200)
                }
            }
            else {
                console.log(`[RTMP] Validate: User is not in a voice channel. ("${streamKey}")`)
                return res.sendStatus(403)
            }
        });
        app.post('/update', async (req, res) => {
            const streamKey = req.body.name; // 'name' = stream key from NGINX
            const repo = Bot.dataSource.getRepository(ClanApplication);
            const appEntry = await repo.findOne({ where: { streamKey } });
            if (!appEntry) {
                console.log(`[RTMP] Update: stream key "${streamKey}" does not have an app entry, disconnecting.`);
                return res.sendStatus(403)
            }
            const repoRadioBot = Bot.dataSource.getRepository(RadioBot);
            const radio = await repoRadioBot.findOne({ where: { userId: appEntry?.userId } });
            if (!radio) {
                console.log(`[RTMP] Update: stream key "${streamKey}" is not being used, disconnecting.`);
                return res.sendStatus(403)
            }
            // Check if user is in voice
            const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
            if (!guild) {
                console.log(`[RTMP] Update: Guild is not found "${streamKey}"`);
                return res.sendStatus(403)
            }
            const member = await guild.members.fetch(appEntry.userId)
            if (!member) {
                console.log(`[RTMP] Update: Member is not found "${streamKey}"`);
                return res.sendStatus(403)
            }
            if (member.voice?.channelId !== radio.channel) {
                console.log(`[RTMP] Update: Member is not in radio channel "${streamKey}"`)
                return res.sendStatus(403)
            }
            console.log(`[RTMP] Update: stream key "${streamKey}" is active, OK.`);
            const bot = Discord.radios[radio.token]
            if (!bot.user?.id) {
                console.log(`[RTMP] Update: Bot has no user id ${bot.token}`)
                return res.sendStatus(403)
            }
            const stream = Voice.streams[radio.token]
            if (stream?.connection?.state.status !== VoiceConnectionStatus.Ready) {
                res.on('finish', async () => {
                    console.log('Finish: Opening stream')
                    await Voice.openStream(streamKey)
                })
            }
            res.sendStatus(200)
        })
        this.server = app.listen(3000, () => console.log('Auth API listening on port 3000'));
        this.app = app
    }

    private static processCommits = async() => {
        const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        if (guild) {
            const channel = await guild.channels.fetch("1423083129358385312") as TextChannel
            if (channel) {
                // Add all commits
                const dir = readdirSync(path.join(__dirname, '../assets/commits'), {
                    withFileTypes: true
                })
                for (const entry of dir) {
                    if (entry.isFile() && entry.name.endsWith('.txt')) {
                        await channel.send(`Hey, <@&1423086828227006639> there's a new commit:\n${readFileSync(path.join(__dirname, '../assets/commits', entry.name)).toString('utf8').replace(/\\n/g, '\n')}`)
                        rmSync(path.join(__dirname, '../assets/commits', entry.name))
                    }
                }
            }
        }
    }
}