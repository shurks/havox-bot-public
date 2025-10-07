import dotenv from 'dotenv';
import Discord from './discord/discord';
import Twitch from './twitch/twitch';
import 'reflect-metadata'
import Database from './database';
import { DataSource } from 'typeorm';
import { execSync } from 'child_process';
import path from 'path';
import ApproveTrialistTask from './discord/tasks/approve-trialist-task';
import SortRelationManager from './discord/tasks/sort-relation-manager';
import Stats from './discord/commands/stats';
import { readdirSync, readFileSync, rmSync } from 'fs';
import Variables from './variables';
import { PermissionFlagsBits, PermissionsBitField, REST, Routes, TextChannel, VoiceChannel } from 'discord.js';
import ProcessAllMembersTask from './discord/tasks/process-all-members-task';
import { Metadata } from './entities/metadata';
import { RadioBot } from './entities/radio-bot';
import ObsMusic from './discord/commands/obs-music';
dotenv.config();

process.on('SIGINT', () => {
  console.log('🛑 Caught SIGINT, shutting down gracefully...');
  Bot.running = false;
});
process.on('SIGTERM', () => {
  console.log('🛑 Caught SIGTERM, shutting down gracefully...');
  Bot.running = false;
});

export default class Bot {
    public static dataSource: DataSource

    public static main = async (cron = false) => {
        console.log('Initializing data source')
        await this.initializeDataSource()
        const repo = Bot.dataSource.getRepository(Metadata)
        const metadata = await repo.find()
        for (const m of metadata) {
            (Variables.env as any)[m.key] = m.value
        }
        console.log('Starting discord bot')
        await Discord.main()
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
                if (bot.userId) {
                    const botMember = await guild.members.fetch(bot.userId)
                    const voiceChannel = botMember.voice.channel;
    
                    if (voiceChannel) {
                        await ObsMusic.main({
                            guild: guild,
                            channelId: bot.channel,
                            user: {
                                id: bot.userId
                            },
                            editReply: () => {}
                        } as any, true)
                        await voiceChannel?.send(`✅ Resumed audio, user is still here after update.`)
                    }
                    else {
                        const radio = Discord.radios[bot.token]
                        if (radio?.user) {
                            const botMember = await guild.members.fetch(radio.user.id)
                            const voiceChannel = botMember.voice.channel;
                            await botMember.voice.disconnect()
                            await voiceChannel?.send(`✅ Disconnected audio, user is no longer here after update.`)
                        }
                        bot.userId = null
                        await botRepo.save(bot)
                    }
                }
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
        }
        else {
            console.log('Running cronjobs')
            this.runCronJobs()
        }
    }

    public static running = true

    private static runCronJobs = async() => {
        let counter = 0
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
            await new Promise<void>((res, rej) => setTimeout(res, 1000 * 60 * 5))
            await processAllMembers()
            await processFrequent() 
            if (++counter % 12 === 0) {
                console.log('Approving/declining trialists')
                await ApproveTrialistTask.main()
                console.log('✅')
            }
            console.log('✅')
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

    private static processCommits = async() => {
        console.log('Processing commits')
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