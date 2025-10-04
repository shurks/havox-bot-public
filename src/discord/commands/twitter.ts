import { ChatInputCommandInteraction } from "discord.js"
import Bot from "../../bot"
import { ClanApplication } from "../../entities/clan-application"

export default class Twitter {
    public static main = async (interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser('user')
        if (!user) {
            await interaction.editReply(`❌ No user selected.`)
            return
        }
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const applications = await repo.find({
            where: {
                userId: user.id
            }
        })
        if (!applications?.length) {
            await interaction.editReply(`❌ User did not specify a twitter hook.`)
            return
        }
        for (const app of applications) {
            await interaction.editReply(`✅ Twitter: "https://twitter.com/${app.twitter}".`)
            return
        }
        await interaction.editReply(`❌ User did not specify a twitter hook.`)
    }
}