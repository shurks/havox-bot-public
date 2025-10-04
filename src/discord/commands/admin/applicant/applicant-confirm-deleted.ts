import { ChatInputCommandInteraction, Message, TextChannel } from "discord.js"
import Bot from "../../../../bot"
import { ClanApplication } from "../../../../entities/clan-application"
import Variables from "../../../../variables"

export default class ApplicantConfirmDeleted {
    public static main = async (interaction: ChatInputCommandInteraction) => {
        const clanApplicationRepo = Bot.dataSource.getRepository(ClanApplication)
        const clanApplications = await clanApplicationRepo.find({
            where: {
                userId: interaction.options.getString('user-id', true)
            }
        })
        if (!clanApplications?.length) {
            await interaction.editReply(`❌ User is not found "${interaction.options.getString('user-id') || 'null'}"`)
            return
        }
        for (const app of clanApplications) {
            app.approved = false
            app.trial = false
            await clanApplicationRepo.save(app)
            if (app.messageIdExpelAsap) {
                const channel = await interaction.guild?.channels.fetch(Variables.var.ExpelASAPChannel) as TextChannel
                if (!channel) continue
                const message = await channel.messages.fetch(app.messageIdExpelAsap) as Message
                if (!message) continue
                await message.delete()
            }
        }
        await interaction.editReply(`✅ User deleted`)
    }
}