import { ChatInputCommandInteraction, TextChannel, CategoryChannel, GuildMember, InteractionResponse, PermissionsBitField, User } from "discord.js"
import Bot from "../../../bot"
import { ClanApplication } from "../../../entities/clan-application"
import Variables from "../../../variables"
import fetchOrNull from "../../fetchOrNull"
import SortRelationManager from "../../tasks/sort-relation-manager"

export default class InitializeTicket {
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
        const user = interaction.options.getUser('user') as User
        if (!user) {
            await interaction.editReply('❌ User not found.')
            return
        }
        const member = await interaction.guild.members.fetch(user.id)
        if (!member) {
            await interaction.editReply('❌ User not in discord.')
            return
        }
        const app: ClanApplication = new ClanApplication()
        app.approved = true
        app.archived = false
        app.trial = false
        app.channel = interaction.channelId
        app.userId = interaction.options.getUser('user')!.id
        app.rsn = rsn
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const existing = await repo.find({
            where: {
                rsn
            }
        })
        if (existing.length) {
            await interaction.editReply('❌ RSN already in use.')
            return
        }
        await repo.save(app)
        await interaction.guild.channels.create({
            name: rsn,
            type: 0,
            parent: Variables.var.MembersCategory,
            permissionOverwrites: [
                {
                    id: Variables.var.AppRole,
                    allow: [PermissionsBitField.Flags.MentionEveryone, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                },
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel], // deny @everyone
                },
                {
                    id: Variables.var.StaffRole,
                    allow: [PermissionsBitField.Flags.ViewChannel], // allow role
                },
                {
                    id: member.id,
                    allow: [PermissionsBitField.Flags.ViewChannel], // allow user
                },
            ],
        })
        await SortRelationManager.main()
        await interaction.editReply('✅ Ticket made.')
    }
}