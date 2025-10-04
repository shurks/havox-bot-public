import { ChatInputCommandInteraction } from "discord.js"
import Bot from "../../bot"
import { ClanApplication } from "../../entities/clan-application"
import Variables from "../../variables"
import fetchOrNull from "../fetchOrNull"

export default class Twitters {
    public static main = async (interaction: ChatInputCommandInteraction) => {
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const applications = await repo.find()
        if (!applications?.length) {
            await interaction.editReply({
                content: `❌ No applications`
            })
            return
        }
        const userIds: string[] = []
        let twittersString: string = `Twitter hooks of <@&${Variables.var.ClanMemberRole}>:\n\n`
        for (const app of applications) {
            if (userIds.includes(app.userId)) continue
            const member = await fetchOrNull('member', app.userId)
            if (!member) continue
            if (!member.roles.cache.has(Variables.var.ClanMemberRole)) continue
            if (app.twitter?.length) {
                twittersString += `✅ <@${app.userId}>: "https://twitter.com/${app.twitter}"\n`
            }
            else {
                twittersString += `❌ <@${app.userId}>\n`
            }
            userIds.push(app.userId)
        }
        await interaction.editReply({
            content: twittersString.trim()
        })
    }
}