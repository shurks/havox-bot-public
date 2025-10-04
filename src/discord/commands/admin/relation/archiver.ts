import { ChatInputCommandInteraction, TextChannel } from "discord.js"
import Bot from "../../../../bot"
import { ClanApplication } from "../../../../entities/clan-application"
import Variables from "../../../../variables"
import SortRelationManager from "../../../tasks/sort-relation-manager"
import fetchOrNull from "../../../fetchOrNull"

export default class Archiver {
    public static archive = async (interaction: ChatInputCommandInteraction) => {
        const clanApplicationRepo = Bot.dataSource.getRepository(ClanApplication)
        const clanApplication = await clanApplicationRepo.findOne({
            where: {
                channel: interaction.channelId
            }
        })
        let channel = interaction.channel as TextChannel
        if (![Variables.var.MembersCategory, Variables.var.ArchiveCategory, Variables.var.ClanApplicationsCategory].includes(channel.parentId || '')) {
            await interaction.editReply(`❌ This command can only be used in a ticket.`)
            return
        }
        if (!clanApplication) {
            console.log(`Deleted channel "${channel}", because it has no database entry.`)
            await interaction.guild?.channels.delete(channel)
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
            await interaction.editReply(`❌ Clan member is not found.`)
            return
        }
        else if (!staffMember.roles.cache.has(Variables.var.OwnerRole) && (applicant.roles.cache.has(Variables.var.StaffRole) || applicant.roles.cache.has(Variables.var.OwnerRole))) {
            await interaction.editReply(`❌ Only the clan owner is permitted to do this.`)
            return
        }
        await applicant.roles.remove(Variables.var.OwnerRole)
        await applicant.roles.remove(Variables.var.StaffRole)
        await applicant.roles.remove(Variables.var.ClanMemberRole)
        await applicant.roles.remove(Variables.var.ClanFriendRole)
        await applicant.roles.remove(Variables.var.ClanFriendRole)
        await applicant.roles.add(Variables.var.CommunityMemberRole)
        await channel.send(`❌ This ticket has been archived by <@${staffMember.user.id}>`)
        const apps = await clanApplicationRepo.find({
            where: {
                userId: applicant.user.id
            }
        })
        for (const app of apps) {
            console.log(app)
            if (!app.channel) continue
            let channel = await staffMember.guild.channels.fetch(app.channel) as TextChannel
            if (!channel) continue
            console.log('1')
            app.userLeft = false
            app.approved = false
            app.trial = false
            app.archived = true
            if (app.messageIdTrialists) {
                let channel2 = await applicant.guild.channels.fetch(Variables.var.TrialistsChannel) as TextChannel
                if (!channel2) {
                    console.error(`Trialists channel is gone.`)   
                }
                else {
                    try {
                        const message = await channel2.messages.fetch(app.messageIdTrialists)
                        if (message) {
                            await message.delete()
                        }
                        app.messageIdTrialists = null
                    }
                    catch (err) {
                        app.messageIdTrialists = null
                    }
                }
            }
            console.log('2')
            channel = await channel.setParent(Variables.var.ArchiveCategory, { lockPermissions: false })
            channel = await channel.permissionOverwrites.create(applicant.user.id, {
                ViewChannel: false
            }) as TextChannel
            console.log('3')
            await clanApplicationRepo.save(app)
            console.log('4')
        }
            console.log('5')
        await interaction.editReply(`❌ Archived`)
    }
    public static unarchive = async (interaction: ChatInputCommandInteraction) => {
        const clanApplicationRepo = Bot.dataSource.getRepository(ClanApplication)
        const clanApplication = await clanApplicationRepo.findOne({
            where: {
                channel: interaction.channelId
            }
        })
        let channel = interaction.channel as TextChannel
        if (![Variables.var.MembersCategory, Variables.var.ArchiveCategory].includes(channel.parentId || '')) {
            await interaction.editReply(`❌ This command can only be used in a ticket.`)
            return
        }
        if (!clanApplication) {
            console.log(`Deleted channel "${channel}", because it has no database entry.`)
            await interaction.guild?.channels.delete(channel)
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
            await interaction.editReply(`❌ Clan member is not found.`)
            return
        }
        await applicant.roles.remove(Variables.var.CommunityMemberRole)
        await applicant.roles.add(Variables.var.CommunityMemberRole)
        // TODO: check all repos and make sure that archived users are handled correctly.
        const apps = await clanApplicationRepo.find({
            where: {
                userId: applicant.user.id
            }
        })
        for (const app of apps) {
            if (!app.channel) continue
            let channel = await staffMember.guild.channels.fetch(app.channel) as TextChannel
            if (!channel) continue
            app.approved = false
            app.trial = false
            app.archived = false
            await clanApplicationRepo.save(app)
            channel = await channel.setParent(Variables.var.ClanApplicationsCategory, {
                lockPermissions: false
            })
            channel = await channel.setPosition(1)
            channel = await channel.permissionOverwrites.create(applicant.user.id, {
                ViewChannel: true
            }) as TextChannel
            await channel.send(`✅ This ticket has been reopened by <@${staffMember.user.id}>. Please proceed with the \`/start-trial\` command to start a new trial of forgiveness for <@${applicant.id}>.`)
        }
        await interaction.editReply(`✅ Unarchived`)
    }
}