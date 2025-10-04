import { ChatInputCommandInteraction } from "discord.js"
import Bot from "../../bot"
import { ClanApplication } from "../../entities/clan-application"

export default class RSN {
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
            await interaction.editReply(`❌ User did not specify a RSN`)
            return
        }
        if (applications.length === 1)
            await interaction.editReply(`RSN: ${applications.filter((v) => v.rsn?.trim().length).map(v => v.rsn).join(', ')}`)
        else 
            await interaction.editReply(`RSN's: ${applications.filter((v) => v.rsn?.trim().length).map(v => v.rsn).join(', ')}`)
    }
}