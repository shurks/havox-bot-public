import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { ClanApplication } from "../../../entities/clan-application";
import Bot from "../../../bot";
import Variables from "../../../variables";
import fetchOrNull from "../../fetchOrNull";
import SortRelationManager from "../../tasks/sort-relation-manager";

export default class RelationSetRSN {
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
        const rsn = interaction.options.getString('rsn', true).trim()
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
        const otherRsnApplications = await repo.find({
            where: {
                rsn: rsn.toLowerCase()
            }
        })
        if (otherRsnApplications.length) {
            const member = await fetchOrNull('member', user.id)
            if (!member) {
                await interaction.editReply('❌ You are not a member of this clan.')
                return
            }
            if (!member.roles.cache.has(Variables.var.StaffRole)) {
                await interaction.editReply('❌ This RSN is already in use.')
                return
            }
        }
        clanApplication.rsn = rsn.toLowerCase()
        await repo.save(clanApplication)
        // Change name and move to members category
        await applicantChannel.setName(rsn.replace(/\s/g, '-')!)
        await interaction.editReply(`✅ RSN set to "${rsn}".`)
    }
}