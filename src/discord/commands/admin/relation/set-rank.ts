import { ChatInputCommandInteraction, TextChannel } from "discord.js"
import Bot from "../../../../bot"
import { ClanApplication } from "../../../../entities/clan-application"
import Variables from "../../../../variables"
import fetchOrNull from "../../../fetchOrNull"

export default class SetRank {
    public static main = async(interaction: ChatInputCommandInteraction) => {
        const clanApplicationRepo = Bot.dataSource.getRepository(ClanApplication)
        const clanApplication = await clanApplicationRepo.findOne({
            where: {
                channel: interaction.channelId
            }
        })
        if (!clanApplication) {
            await interaction.editReply(`❌ Command must be used within a ticket.`)
            return
        }
        const staffMember = await fetchOrNull('member', interaction.user.id)
        if (!staffMember) {
            await interaction.editReply('❌ You are not a staff member.')
            return
        }
        else if (!staffMember.roles.cache.has(Variables.var.StaffRole)) {
            await interaction.editReply('❌ You are not a staff member.')
            return
        }
        const applicant = await fetchOrNull('member', clanApplication.userId)
        if (!applicant) {
            await interaction.editReply(`❌ Member not found.`)
            return
        }
        const rank = Variables.var.Emojis[interaction.options.getString('rank', true) as keyof typeof Variables.var.Emojis]
        for (const [k, role] of Object.entries(Variables.var.Emojis)) {
            if (applicant.roles.cache.has(role.role) && role.role !== rank.role) {
                await applicant.roles.remove(role.role)
            }
        }
        if (!applicant.roles.cache.has(rank.role)) {
            await applicant.roles.add(rank.role)
        }
        const rankupsChannel = await interaction.guild?.channels.fetch(Variables.var.RankupsChannel) as TextChannel
        if (!rankupsChannel) {
            await interaction.editReply(`❌ Rank-ups channel is not found.`)
            return
        }
        const rankup = await rankupsChannel.send(`Congratulations <@${applicant.user.id}> on the promotion to ${rank.label} <:a:${rank.id}>!`)
        await rankup.react(rank.id)
        await rankup.react('❤️')
        await interaction.editReply({
            content: `✅ Successfully assigned rank ${rank.label} <:a:${rank.id}> to clan member "<@${clanApplication.userId}>".`
        })
    }
}