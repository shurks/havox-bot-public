import { ChatInputCommandInteraction } from "discord.js";
import { ClanApplication } from "../../../entities/clan-application";
import Bot from "../../../bot";
import fetchOrNull from "../../fetchOrNull";

export default class SetTwitter {
    public static main = async (interaction: ChatInputCommandInteraction) => {
        const repo = Bot.dataSource.getRepository(ClanApplication)
        let applications = await repo.find({
            where: {
                channel: interaction.channelId
            }
        })
        if (!applications?.length) {
            await interaction.editReply(`❌ Command must be used inside a ticket.`)
            return
        }
        const user = await fetchOrNull('member', applications[0].userId)
        if (!user) {
            await interaction.editReply(`❌ User left the discord.`)
            return
        }
        const clanApplication = applications[0]
        const applicantChannel = await interaction.guild?.channels.fetch(clanApplication.channel!)
        if (!applicantChannel) {
            await interaction.editReply(`❌ Channel "${clanApplication.channel}" not found.`)
            return
        }
        applications = await repo.find({
            where: {
                userId: user.id
            }
        })
        if (!applications?.length) {
            await interaction.editReply(`❌ Invalid ticket, no clan applications found for user.`)
            return
        }
        const twitter = interaction.options.getString('username')?.trim()
        if (!twitter?.length) {
            await interaction.editReply(`❌ No twitter account was given.`)
            return
        }
        if (!/^@[A-Za-z0-9_]{1,15}$/g.test(twitter)) {
            await interaction.editReply(`❌ Wrong syntax: "https://twitter.com/${twitter}"`)
            return
        }
        for (const app of applications) {
            app.twitter = twitter
            await repo.save(app)
        }
        await interaction.editReply(`✅ Twitter account set to "https://twitter.com/${twitter}".`)
    }
}