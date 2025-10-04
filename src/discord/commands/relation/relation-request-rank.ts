import { ChatInputCommandInteraction, TextChannel } from "discord.js"
import Bot from "../../../bot"
import { ClanApplication } from "../../../entities/clan-application"
import Variables from "../../../variables"

export default class RelationRequestRank {
    public static main = async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.user
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const applications = await repo.find({
            where: {
                userId: user.id,
                channel: interaction.channelId
            }
        })
        if (!applications?.length) {
            await interaction.editReply(`❌ You can only ask for rank-ups in your ticket.`)
            return
        }
        const rank = Variables.var.Emojis[interaction.options.getString('rank', true) as keyof typeof Variables.var.Emojis]
        const reason = interaction.options.getString('reason')?.trim()
        if (!reason?.length) {
            await interaction.editReply(`❌ You must specify why you qualify.`)
            return
        }
        for (const app of applications) {
            app.twitter = reason
            await repo.save(app)
        }
        const channel = interaction.channel as TextChannel
        await channel.send(`<@&${Variables.var.StaffRole}>, please rank <@${user.id}> to ${rank.label} <:a:${rank.id}>, he/she qualifies because: ${reason}.\n\nUse the \`/set-rank\` command, if you approve.`)
        await interaction.editReply(`✅ Successfully requested rank.`)
    }
}