import { ChatInputCommandInteraction, GuildMember } from "discord.js"
import Variables from "../../../variables"
import Bot from "../../../bot"
import { ClanApplication } from "../../../entities/clan-application"

export default class DeleteRSN {
    public static main = async (interaction: ChatInputCommandInteraction) => {
        const staff = interaction.member as GuildMember
        if (!staff.roles.cache.has(Variables.var.StaffRole)) {
            await interaction.editReply('❌ You are not staff.')
            return
        }
        if (!interaction.guild) {
            await interaction.editReply('❌ No guild.')
            return
        }
        const rsn = interaction.options.getString('rsn', true).trim().replace(/\s/g, '-')
        if (rsn.length > 12) {
            await interaction.editReply('❌ RSN can not be longer than 12 characters: "' + rsn + '"')
            return
        }
        else if (!/^[0-9a-zA-Z-_ ]+$/.test(rsn)) {
            await interaction.editReply('❌ RSN contains wrong format: "' + rsn + '"')
            return
        }
        else if (!rsn.length) {
            await interaction.editReply('❌ RSN can not be empty.')
            return
        }
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const rsnApp = await repo.findOne({
            where: {
                rsn
            }
        })
        if (!rsnApp || !rsnApp.channel) {
            await interaction.editReply('❌ RSN not found.')
            return
        }
        const channelApp = await repo.findOne({
            where: {
                channel: interaction.channelId
            }
        })
        if (!channelApp) {
            await interaction.editReply('❌ This command can only be used in a ticket.')
            return
        }
        if (channelApp.userId !== rsnApp.userId) {
            await interaction.editReply('❌ This ticket is not linked to the user who has that RSN.')
            return
        }
        const others = await repo.find({
            where: {
                userId: rsnApp.userId
            }
        })
        if (others.length < 2) {
            await interaction.editReply('❌ Could not remove RSN for this user, as it\'s their only linked runescape name to a ticket.')
            return
        }
        const channel = await interaction.guild.channels.fetch(rsnApp.channel!)
        if (channel) {
            await channel.delete()
        }
        await repo.delete(rsnApp.id)
        await interaction.editReply('✅ Deleted RSN from user')
    }
}