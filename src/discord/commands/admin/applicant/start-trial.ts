import { CategoryChannel, ChatInputCommandInteraction, GuildMember, Interaction, Message, TextChannel } from "discord.js";
import Variables from "../../../../variables";
import Bot from "../../../../bot";
import { ClanApplication } from "../../../../entities/clan-application";
import fetchOrNull from "../../../fetchOrNull";
import SortRelationManager from "../../../tasks/sort-relation-manager";

export default class StartTrial {
    public static main = async (interaction: ChatInputCommandInteraction) => {
        const clanApplicationRepo = Bot.dataSource.getRepository(ClanApplication)
        const clanApplication = await clanApplicationRepo.findOne({
            where: {
                channel: interaction.channelId!
            }
        })
        if (!clanApplication) {
            await interaction.editReply(`❌ This command can only be used within a ticket.`)
            return
        }
        const rsn = interaction.options.getString('rsn', true).trim().toLowerCase()
        const textChannel = interaction.channel as TextChannel
        let staffMember = await fetchOrNull('member', interaction.user.id)
        if (!staffMember) {
            await interaction.editReply('❌ You are not a staff member.')
            return
        }
        const applicantChannel = await interaction.guild?.channels.fetch(clanApplication.channel!) as TextChannel
        const applicant = await fetchOrNull('member', clanApplication.userId)
        const trialistsChannel = await interaction.guild?.channels.fetch(Variables.var.TrialistsChannel) as TextChannel
        const category = await applicantChannel.guild.channels.fetch(Variables.var.MembersCategory) as CategoryChannel
        const clanApplications = await clanApplicationRepo.find({
            where: {
                userId: clanApplication.userId
            }
        })
        if (clanApplication.archived) {
            await interaction.editReply(`❌ This ticket is archived.`)
            return
        }
        if (clanApplication.userLeft) {
            await interaction.editReply(`❌ The user is not in the discord.`)
            return
        }
        if (!category) {
            await interaction.editReply(`❌ Staff Related category does not exist.`)
            return
        }
        else if (!trialistsChannel) {
            await interaction.editReply(`❌ Trialists channel does not exist.`)
            return
        }
        else if (!applicant) {
            await interaction.editReply(`❌ Applicant "${clanApplication.userId || 'null'}" does not exist.`)
            return
        }
        else if (!applicantChannel) {
            await interaction.editReply(`❌ Channel "${clanApplication.channel || 'null'}" does not exist.`)
            return
        }
        else if (!staffMember) {
            
        }
        else if (!staffMember.roles.cache.has(Variables.var.StaffRole)) {
            await interaction.editReply('❌ You are not a staff member.')
            return
        }
        else if (rsn.length > 12) {
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
        else {
            const otherRsnApplications = await clanApplicationRepo.find({
                where: {
                    rsn: rsn.toLowerCase()
                }
            })
            for (const app of otherRsnApplications) {
                app.rsn = null
                await clanApplicationRepo.save(app)
            }
            clanApplication.rsn = rsn
            const rank = Variables.var.Emojis[interaction.options.getString('rank', true) as keyof typeof Variables.var.Emojis]
            for (const [k, role] of Object.entries(Variables.var.Emojis)) {
                if (applicant.roles.cache.has(role.role) && role.role !== rank.role) {
                    await applicant.roles.remove(role.role)
                }
            }
            if (!applicant.roles.cache.has(rank.role)) {
                await applicant.roles.add(rank.role)
            }
            await clanApplicationRepo.save(clanApplication)
            // assign role to user's member
            await applicant.roles.add(Variables.var.ClanMemberRole, `Assigned by "${staffMember.user.username}" in ticket ${clanApplication.id}`)
            await applicant.roles.remove(Variables.var.CommunityMemberRole, `Removed, because of addition to clan.`)
            if (!clanApplication.trial && !clanApplication.approved && !clanApplications.find((v) => v.approved || v.trial)) {
                // Send message in trialists channel
                const trialist = await trialistsChannel.send(
                    `Hello <@&${Variables.var.ClanMemberRole}>!\n\nWelcome <@${applicant.user.id}> (${clanApplication.rsn}), our newest ${rank.label} <:a:${rank.id}>!`
                )
                await trialist.react('❤️')
                await trialist.react('❌')
                // Update clan application
                clanApplication.messageIdTrialists = trialist.id
                clanApplication.trial = true
                await clanApplicationRepo.save(clanApplication)
            }
            // Change name and move to members category
            const apps = await clanApplicationRepo.find({
                where: {
                    userId: applicant.user.id
                }
            })
            await applicantChannel.setName(rsn || clanApplication.rsn?.replace(/\s/g, '-') || trialistsChannel.name)
            for (const app of apps) {
                if (!app.channel) continue
                let channel = await applicant.guild.channels.fetch(app.channel) as TextChannel
                if (!channel) continue
                await channel.setParent(category, { lockPermissions: false })
            }
            await SortRelationManager.main()
            await interaction.editReply({
                content: `Successfully approved clan member "${rsn}", assigned rank ${rank.label} <:a:${rank.id}> and moved to Relation Manager category.\n\nYour week's trial starts now, all we ask is to send positive vibes. If you want you can tell us a little about yourself in the <#1422937686758395904> channel :)`
            })
        }
    }
}