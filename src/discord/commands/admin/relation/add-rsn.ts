import { CategoryChannel, ChatInputCommandInteraction, Interaction, PermissionsBitField, Role, TextChannel } from "discord.js";
import Variables from "../../../../variables";
import { ClanApplication } from "../../../../entities/clan-application";
import Bot from "../../../../bot";
import fetchOrNull from "../../../fetchOrNull";
import Discord from "../../../discord";
import SortRelationManager from "../../../tasks/sort-relation-manager";

export default class AddRSN {
    public static main = async(interaction: ChatInputCommandInteraction) => {
        const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        if (!guild) {
            interaction.editReply(`❌ No guild.`)
            return
        }
        const iChannel = await guild.channels.fetch(interaction.channelId) as TextChannel
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const channelApps = await repo.find({
            where: {
                channel: interaction.channelId
            }
        })
        if (!channelApps?.length) {
            interaction.editReply(`❌ You must be in a ticket to use this command.`)
            return
        }
        const user = await fetchOrNull('member', channelApps[0].userId)
        if (!user) {
            interaction.editReply(`❌ Member left the discord.`)
            return
        }
        const rsn = interaction.options.getString('rsn', true).trim()
        const category = await interaction.guild?.channels.fetch(Variables.var.MembersCategory) as CategoryChannel
        if (!user.roles.cache.has(Variables.var.ClanMemberRole)) {
            interaction.editReply(`❌ User is not a clan member.`)
            return
        }
        const authMember = await fetchOrNull('member', interaction.user.id)
        if (!authMember) {
            interaction.editReply(`❌ This command is only for staff.`)
            return
        }
        if (!authMember.roles.cache.has(Variables.var.StaffRole) && !authMember.roles.cache.has(Variables.var.OwnerRole)) {
            interaction.editReply(`❌ This command is only for staff.`)
            return
        }
        if (rsn.length > 12) {
            await interaction.editReply('❌ RSN can not be longer than 12 characters: "' + rsn + '"')
            return
        }
        if (!/^[0-9a-zA-Z-_ ]+$/.test(rsn)) {
            await interaction.editReply('❌ RSN contains wrong format: "' + rsn + '"')
            return
        }
        const applications = await repo.find({
            where: {
                userId: user.id
            }
        })
        if (applications?.length) {
            let filtered = applications.filter((v) => v.rsn === rsn)
            if (filtered.length) {
                await interaction.editReply('❌ Channel already exists.')
                return
            }
        }
        const application = new ClanApplication()
        application.userId = user.id
        application.rsn = rsn
        const channel = await interaction.guild?.channels.create({
            name: rsn,
            type: 0,
            parent: Variables.var.ClanApplicationsCategory,
            permissionOverwrites: [
                {
                    id: Variables.var.AppRole,
                    allow: [PermissionsBitField.Flags.MentionEveryone, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                },
                {
                    id: interaction.guild?.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel], // deny @everyone
                },
                {
                    id: Variables.var.StaffRole,
                    allow: [PermissionsBitField.Flags.ViewChannel], // allow role
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel], // allow user
                },
            ],
        })
        if (!channel) {
            await interaction.editReply('❌ Could not create channel')
            return
        }
        // TODO: remove RSN
        application.channel = channel.id
        application.approved = true
        application.trial = false
        await repo.save(application)
        await channel.setParent(category, { lockPermissions: false })
        await SortRelationManager.main()
        await interaction.editReply('✅ Created channel')
    }
}