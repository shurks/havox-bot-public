import { ChatInputCommandInteraction, TextChannel } from "discord.js"
import Bot from "../../../../bot"
import { ClanApplication } from "../../../../entities/clan-application"
import Variables from "../../../../variables"
import fetchOrNull from "../../../fetchOrNull"
import ProcessAllMembersTask from "../../../tasks/process-all-members-task"

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
        const rankKey = interaction.options.getString('rank', true) as keyof typeof Variables.var.Emojis
        const rank = Variables.var.Emojis[rankKey]
        const otherApplications = await clanApplicationRepo.find({
            where: {
                userId: clanApplication.userId
            }
        })
        let maxRankKey = interaction.options.getString('rank', true) as keyof typeof Variables.var.Emojis
        for (const app of otherApplications) {
            if (await ProcessAllMembersTask.isLowerRankThan(maxRankKey, app.assignedRank as keyof typeof Variables.var.Emojis)) {
                maxRankKey = app.assignedRank as any
            }
        }
        console.log(maxRankKey, rankKey)
        if (await ProcessAllMembersTask.isLowerRankThan(maxRankKey, rankKey)) {
            for (const [k, role] of Object.entries(Variables.var.Emojis)) {
                if (applicant.roles.cache.has(role.role) && role.role !== rank.role) {
                    await applicant.roles.remove(role.role)
                }
            }
            if (!applicant.roles.cache.has(rank.role)) {
                await applicant.roles.add(rank.role)
            }
        }
        const rankupsChannel = await interaction.guild?.channels.fetch(Variables.var.RankupsChannel) as TextChannel
        if (!rankupsChannel) {
            await interaction.editReply(`❌ Rank-ups channel is not found.`)
            return
        }
        const rankup = await rankupsChannel.send(`Congratulations <@${applicant.user.id}> (${clanApplication.rsn}) on the promotion to ${rank.label} <:a:${rank.id}>!`)
        await rankup.react(rank.id)
        await rankup.react('❤️')
        clanApplication.assignedRank = interaction.options.getString('rank', true) as keyof typeof Variables.var.Emojis
        await clanApplicationRepo.save(clanApplication)
        await interaction.editReply({
            content: `✅ Successfully assigned rank ${rank.label} <:a:${rank.id}> to clan member "<@${clanApplication.userId}>".`
        })
    }
}