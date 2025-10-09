import { ChatInputCommandInteraction, VoiceChannel } from "discord.js"
import Bot from "../../bot"
import { ClanApplication } from "../../entities/clan-application"
import Variables from "../../variables"
import Discord from "../discord"

export default class SetStreamKey {
    public static main = async (interaction: ChatInputCommandInteraction) => {
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