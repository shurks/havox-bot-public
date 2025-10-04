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
import { TextChannel } from 'discord.js';
import ProcessAllMembersTask from './discord/tasks/process-all-members-task';
import { Metadata } from './entities/metadata';
dotenv.config();

export default class Bot {
    public static dataSource: DataSource

    public static main = async () => {
        console.log('Initializing data source')
        await this.initializeDataSource()
        const repo = Bot.dataSource.getRepository(Metadata)
        const metadata = await repo.find()
        for (const m of metadata) {
            (Variables.env as any)[m.key] = m.value
        }
        console.log('Starting discord bot')
        await Discord.main()
        console.log('Starting twitch bot')
        await Twitch.main()
        console.log('Processing commits')
        // await this.processCommits()
        // console.log('Running cronjobs')
        // this.runCronJobs()
    }

    private static runCronJobs = async() => {
        const processAllMembers = async() => {
            console.log('Processing all members')
            await ProcessAllMembersTask.main()
            console.log('✅')
        }
        setInterval(processAllMembers, 3600 * 1000)
        await processAllMembers()
        setTimeout(() => {
            setInterval(async() => {
                console.log('Approving/declining trialists')
                await ApproveTrialistTask.main()
                console.log('✅')
            }, 3600 * 1000)
        })
        const processFrequent = async() => {
            console.log('Sorting categories')
            await SortRelationManager.main()
            console.log('Updating hall of fame')
            await Stats.updateHallOfFame()
            console.log('✅')
        }
        setInterval(processFrequent, 5 * 60 * 1000)
        await processFrequent()
        console.log('✅')
    }

    private static initializeDataSource = async() => {
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