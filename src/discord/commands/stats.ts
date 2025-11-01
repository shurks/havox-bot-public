import { ChatInputCommandInteraction, Guild, GuildMember, Message, TextChannel, User } from "discord.js";
import Bot from "../../bot";
import { ClanApplication } from "../../entities/clan-application";
import Discord from "../discord";
import Variables from "../../variables";
import { existsSync, lstat, lstatSync, mkdir, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import * as cheerio from 'cheerio'
import { Not } from "typeorm";
import fetchOrNull from "../fetchOrNull";

export default class Stats {
    public static main = async(interaction: ChatInputCommandInteraction) => {
        const user = interaction.options.getUser('user', true)
        const calculations = await this.calculateForUser(user)
        await this.updateHallOfFame()
        await interaction.editReply(calculations.response.trim())
    }

    public static updateHallOfFame = async() => {
        let calculations: Record<string, ReturnType<typeof Stats['calculateForUser']> extends Promise<infer A> ? A : null> = JSON.parse(readFileSync(path.join(__dirname, '../../../assets/all-user-information.json')).toString('utf8'))
        let mostEHT = Object.entries(calculations).map((v) => [v[0], ({ userId: v[0], eht: v[1].ehtTotal})] as any).sort((x, y) => x[1].eht < y[1].eht ? 1 : x[1].eht > y[1].eht ? -1 : 0).filter((v, i) => i < 10)
        let mostEHP = Object.entries(calculations).map((v) => [v[0], ({ userId: v[0], ehp: v[1].ehpTotal})] as any).sort((x, y) => x[1].ehp < y[1].ehp ? 1 : x[1].ehp > y[1].ehp ? -1 : 0).filter((v, i) => i < 10)
        let mostXP = Object.entries(calculations).map((v) => [v[0], ({ userId: v[0], xp: v[1].xpTotal})] as any).sort((x, y) => x[1].xp < y[1].xp ? 1 : x[1].xp > y[1].xp ? -1 : 0).filter((v, i) => i < 10)
        let mostEHB = Object.entries(calculations).map((v) => [v[0], ({ userId: v[0], ehb: v[1].ehbTotal})] as any).sort((x, y) => x[1].ehb < y[1].ehb ? 1 : x[1].ehb > y[1].ehb ? -1 : 0).filter((v, i) => i < 10)
        let mostPerSkill: Record<string, Array<{ userId: string, xp: number, ehp: number }>> = {}
        let mostCategories = Object.entries(calculations).sort(([x, xx], [y, yy]) => xx.highestCategories < yy.highestCategories ? 1 : xx.highestCategories > yy.highestCategories ? -1 : 0)
        let mostClogs = Object.entries(calculations).sort(([x, xx], [y, yy]) => xx.highestClogs < yy.highestClogs ? 1 : xx.highestClogs > yy.highestClogs ? -1 : 0)
        let mostEhc = Object.entries(calculations).sort(([x, xx], [y, yy]) => xx.ehcTotal < yy.ehcTotal ? 1 : xx.ehcTotal > yy.ehcTotal ? -1 : 0)
        for (const calculation of Object.entries(calculations)) {
            for (const [skill, v] of Object.entries(calculation[1].skills)) {
                if (!mostPerSkill[skill]) {
                    mostPerSkill[skill] = []
                }
                mostPerSkill[skill].push({
                    ehp: calculation[1].ehp[skill] || 0,
                    userId: calculation[1].userId,
                    xp: calculation[1].skills[skill] || 0
                })
            }
        }
        for (const [skill, array] of Object.entries(mostPerSkill)) {
            mostPerSkill[skill] = array.sort((x, y) => x.ehp < y.ehp ? 1 : x.ehp > y.ehp ? -1 : 0)
        }
        const sortedSkills = Object.entries(mostPerSkill)
            .sort(([sx, ox], [sy, oy]) => (oy[0]?.ehp || 0) - (ox[0]?.ehp || 0))
            .map(([skill]) => skill);
        let mostPerBoss: Record<string, Array<{ userId: string, kc: number, ehb: number }>> = {}
        for (const calculation of Object.entries(calculations)) {
            for (const [boss, v] of Object.entries(calculation[1].kc)) {
                if (!mostPerBoss[boss]) {
                    mostPerBoss[boss] = []
                }
                mostPerBoss[boss].push({ 
                    ehb: calculation[1].ehb[boss] || 0,
                    userId: calculation[1].userId,
                    kc: calculation[1].kc[boss] || 0
                })
            }
        }
        for (const [boss, array] of Object.entries(mostPerBoss)) {
            mostPerBoss[boss] = array.sort((x, y) => x.ehb < y.ehb ? 1 : x.ehb > y.ehb ? -1 : 0)
        }
        const sortedBosses = Object.entries(mostPerBoss)
            .sort(([sx, ox], [sy, oy]) => (oy[0]?.ehb || 0) - (ox[0]?.ehb || 0))
            .map(([boss]) => boss);
        let message1 = `Hey there <@&${Variables.var.ClanMemberRole}>, this is our hall of fame. You can update it by using the /stats command, so get some gains and you'll be on here too!\n\nThe numbers are based on a combined amount from all your accounts in the clan. You can use the \`/stats\` command to check on your own combined stats. Stats per account can be seen on our TempleOSRS page: https://templeosrs.com/groups/members.php?id=2305\n\nWe use TempleOSRS for collection log tracking, so if you want your collection log numbers on this message, then install the templeosrs runelite plugin, open your collection log and click the TempleOSRS sync button. You should then see your collection log information on your TempleOSRS profile too.\n\n`
        message1 += `Top 10 Efficient Hours Total (EHP + EHB + EHC):\n`
        for (let i = 0; i < 10; i ++) {
            if (i > mostEHT.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message1 += `${icon} <@${mostEHT[i][1]?.userId}>: ${Math.round(mostEHT[i][1].eht)}\n`
        }
        message1 += `\nTop 10 Efficient Hours Played\n`
        for (let i = 0; i < 10; i ++) {
            if (i > mostEHP.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message1 += `${icon} <@${mostEHP[i][1]?.userId}>: ${mostEHP[i][1].ehp}\n`
        }
        message1 += '.'
        let message2 = `Top 10 XP\n`
        for (let i = 0; i < 10; i ++) {
            if (i > mostXP.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message2 += `${icon} <@${mostXP[i][1]?.userId}>: ${mostXP[i][1].xp}M XP\n`
        }
        message2 += `\nTop 10 Efficient Hours Bossed\n`
        for (let i = 0; i < 10; i ++) {
            if (i > mostEHB.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message2 += `${icon} <@${mostEHB[i][1]?.userId}>: ${mostEHB[i][1].ehb}\n`
        }
        message2 += '.'
        let message3 = `Top 10 Collection Loggers\n`
        for (let i = 0; i < 10; i ++) {
            if (i > mostClogs.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message3 += `${icon} <@${mostClogs[i][0]}>: ${mostClogs[i][1].highestClogs} items (${Math.round(mostClogs[i][1].highestPercentage * 1000) / 10}%)\n`
        }
        message3 += `\nTop 10 Collection Categories Completed\n`
        for (let i = 0; i < 10; i ++) {
            if (i > mostCategories.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message3 += `${icon} <@${mostCategories[i][0]}>: ${mostCategories[i][1].highestCategories} categories\n`
        }
        message3 += `\nTop 10 Efficient Hours Collection Logged\n`
        for (let i = 0; i < 10; i ++) {
            if (i > mostEhc.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message3 += `${icon} <@${mostEhc[i][0]}>: ${Math.round(mostEhc[i][1].ehcTotal)} EHC\n`
        }
        const guild: Guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        const channel = await guild.channels.fetch("1422875648736624691") as TextChannel
        if (!channel) return
        let fetched
        do {
            fetched = (await channel.messages.fetch({ limit: 100 })).filter((v) => ![
                '1423013708589826199',
                '1423013710687113277',
                '1423013712729473196'
            ].includes(v.id));
            await (channel as any).bulkDelete(fetched, true);
        } while (fetched.size >= 3); // loop until no more messages
        let discordMessage1 = await channel.messages.fetch('1423013708589826199',)
        let discordMessage2 = await channel.messages.fetch('1423013710687113277',)
        let discordMessage3 = await channel.messages.fetch('1423013712729473196')
        await discordMessage1.edit(message1)
        await discordMessage2.edit(message2)
        await discordMessage3.edit(message3)
    }

    public static calculateForAllUsers = async() => {
        const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const apps = await repo.find()
        const ids: any[] = []
        const assetsPath = path.join(__dirname, '../../../assets')
        if (!existsSync(assetsPath)) {
            mkdirSync(assetsPath)
        }
        const name = path.join(assetsPath, `temple-osrs-data.json`)
        if (existsSync(name) && new Date().getTime() - lstatSync(name).mtimeMs < 24 * 3600 * 1000) {
            return
        }
        const calculations: Array<ReturnType<typeof Stats['calculateForUser']> extends Promise<infer A> ? A : null> = []
        for (const app of apps) {
            if (!app.userId) continue
            if (ids.includes(app.userId)) continue
            ids.push(app.userId)
            try {
                const member = await fetchOrNull('member', app.userId)
                if (!member) {
                    continue
                }
                const calculation = await this.calculateForUser(member.user, true)
                calculations.push(calculation)
            }
            catch (err) {}
        }
        writeFileSync(name, JSON.stringify(calculations, null, 4))
    }

    public static calculateForUser = async(user: User, allUsers = false) => {
        console.log(`Calculating user stats for "${user.username}"`)
        const allData: Record<string, ReturnType<typeof Stats.calculateForUser> extends Promise<infer A> ? A : any> = JSON.parse(readFileSync(path.join(__dirname, `../../../assets/all-user-information.json`)).toString('utf-8')) as any
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const apps = (await repo.find({
            where: {
                userId: user.id
            }
        })).filter((v) => !v.archived && !v.userLeft)
        const apiResults: Array<{
            data: any
            rsn: string,
            info: {
                primary_ehp: string
                primary_ehb: string
            },
            userId: string
        }> = []
        let response = ``
        let total = 0
        let tooManyRequests = false
        let ehpMax = 0
        for (const app of apps) {
            if (!app.rsn?.length) continue
            const res = await fetch(`https://templeosrs.com/api/player_stats.php?player=${app.rsn}&bosses=1`)
            if (res.status !== 200) {
                if (res.status === 429) {
                    console.log(`RSN "${app.rsn}": ${res.statusText}`)
                    tooManyRequests = true
                }
                response += `❌ Stats for "${app.rsn}" could not be fetched.\n`
                console.log(`Failed to retrieve stats.`)
                continue
            }
            const json = await res.json()
            total = Math.max(total, json?.data?.Overall_level)
            apiResults.push({
                ...json,
                rsn: app.rsn,
                userId: app.userId
            })
        }
        let stats: Array<{
            EHP: number,
            EHB: number,
            EHC: number,
            XP: number,
            clogs: number
            categories: number
            percentageMaxXPAccount: number
            clogsPercentage: number,
            highestPercentage: number,
            rsn: string
        }> = []
        const skills: Record<string, number> = {}
        const ehp: Record<string, number> = {}
        const kc: Record<string, number> = {}
        const ehb: Record<string, number> = {}
        let highestCategories = 0
        let highestClogs = 0
        let highestPercentage = 0
        let current_total_collections_available = 0
        let percentageMaxXP = 0
        try {
            current_total_collections_available = parseInt(readFileSync(path.join(__dirname, '../../../', 'assets', 'max-clogs.txt')).toString('utf8'))
        }
        catch (err) {}
        let ogClogsAv = current_total_collections_available
        for (const res of apiResults) {
            if (!res?.data?.info) continue
            const EHP = res.data.info.Primary_ehp?.length
                ? typeof res.data[res.data.info.Primary_ehp] === 'number'
                    ? res.data[res.data.info.Primary_ehp]
                    : 0
                : 0
            ehpMax = Math.max(ehpMax, EHP)
            const EHB = res.data.info.Primary_ehb?.length
                ? typeof res.data[res.data.info.Primary_ehb] === 'number'
                    ? res.data[res.data.info.Primary_ehb]
                    : 0
                : 0
            const XP = typeof res.data['Overall'] === 'number' ? res.data['Overall'] : 0
            for (const [k, v] of Object.entries(res.data)) {
                if (k !== 'Overall' && Object.hasOwn(res.data, k + '_rank') && Object.hasOwn(res.data, k + '_level')) {
                    if (typeof skills[k] !== 'number')
                    skills[k] = 0
                    if (typeof v === 'number')
                    skills[k] += v
                    if (typeof ehp[k] !== 'number')
                    ehp[k] = 0
                    if (typeof res.data[k + '_ehp'] === 'number')
                    ehp[k] += res.data[k + '_ehp']
                }
                if (Object.hasOwn(res.data, k + '_ehb')) {
                    if (typeof ehb[k] !== 'number')
                    ehb[k] = 0
                    if (typeof res.data[k + '_ehb'] === 'number')
                    ehb[k] += res.data[k + '_ehb']
                    if (typeof kc[k] !== 'number')
                    kc[k] = 0
                    if (typeof res.data[k] === 'number')
                    kc[k] += res.data[k]
                }
            }
            let EHC = 0
            let clogs = 0
            let categories = 0
            let clogsPercentage = 0
            if (!allUsers) {
                try {
                    const res2 = await fetch(`https://templeosrs.com/api/collection-log/player_collection_log.php?player=${res.rsn}&categories=champions_challenge,castle_wars`)
                    try {
                        if (res2.status === 429) {
                            console.log(`Clogs "${res.rsn}": ${res2.statusText}`)
                            tooManyRequests = true
                        }
                        const json = await res2.json()
                        if (typeof json.data.total_collections_available === 'number' && json.data.total_collections_available !== current_total_collections_available) {
                            current_total_collections_available = json.data.total_collections_available
                        }
                        clogs = json.data.total_collections_finished || 0
                        EHC = json.data.ehc || 0
                        categories = json.data.total_categories_finished || 0
                        clogsPercentage = json.data.total_collections_finished / json.data.total_collections_available
                        highestCategories = Math.max(highestCategories, categories)
                        highestClogs = Math.max(highestClogs, clogs)
                        highestPercentage = Math.max(highestPercentage, clogsPercentage)
                        current_total_collections_available = json.data.total_collections_available
                    }
                    catch (err) {}
                }
                catch (err) {}
            }
            try {
                const res3 = await fetch(`https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(res.rsn)}`)
                if (res3.status === 429) {
                    tooManyRequests = true
                }
                console.log(`Manual Clog "${res.rsn}": ${res3.statusText}`)
                const html = await res3.text()
                const $ = cheerio.load(html)
                const parsed = parseInt($(`a[href]`).filter((_, el) => $(el).text().includes('Collections Logged')).first().parent().next().next().text().replace(',', '') || '0')
                if (!!parsed && typeof parsed === 'number' && parsed + parsed !== parsed) {
                    clogs = parsed
                }
                highestClogs = Math.max(highestClogs, clogs)
                clogsPercentage = current_total_collections_available === 0 ? 0 : clogs / current_total_collections_available
                highestPercentage = Math.max(highestPercentage, clogsPercentage)
            }
            catch (err) {}
            let percentageMaxXPAccount = 0
            if (EHP > 5000) {
                try {
                    const res4 = await fetch(`https://templeosrs.com/player/stats.php?player=${res.rsn}`)
                    if (res4.status === 200) {
                        const html = await res4.text()
                        const $ = cheerio.load(html)
                        // after loading html with cheerio
                        const statsTable = $(".ttm-title-center")
                            .filter((_, el) => $(el).text().includes("Time to 200m all")) // find the correct table
                            .first(); // in case multiple tables match
                        if (statsTable.length) {
                            const parentTable = statsTable.closest("#stats-bottom-container");
                            const percentageMaxXPAccount = parseFloat($(parentTable).children('.table-sortable').children('tfoot').children('tr').last().children('td').last().text()?.replace('%', ''))
                            if (percentageMaxXPAccount + percentageMaxXPAccount !== percentageMaxXPAccount && typeof percentageMaxXPAccount === 'number') {
                                console.log(res.rsn + ' :: ' + percentageMaxXPAccount)
                                percentageMaxXP = Math.max(percentageMaxXP, percentageMaxXPAccount)
                            }
                        }
                    }
                }
            catch (err) {}
            }
            stats.push({
                EHP,
                EHB,
                percentageMaxXPAccount,
                EHC,
                clogs,
                categories,
                clogsPercentage,
                XP,
                highestPercentage,
                rsn: res.rsn
            })
        }
        if (current_total_collections_available !== ogClogsAv) {
            writeFileSync(path.join(__dirname, '../../../', 'assets', 'max-clogs.txt'), current_total_collections_available.toString())
        }
        stats = stats.sort((x, y) => x.EHB + x.EHP + x.EHC < y.EHB + y.EHC + y.EHP ? 1 : x.EHB + x.EHC + x.EHP > y.EHC + y.EHB + y.EHP ? -1 : 0)
        const ehptotal = Math.round(stats.map((v) => v.EHP).reduce((x, y) => x + y, 0))
        const ehbtotal = Math.round(stats.map((v) => v.EHB).reduce((x, y) => x + y, 0))
        let ehctotal = Math.round(stats.map((v) => v.EHC).reduce((x, y) => x + y, 0))
        if (tooManyRequests) {
            ehctotal = allData[user.id]?.ehcTotal
        }
        const clogstotal = Math.round(stats.map((v) => v.clogs).reduce((x, y) => x + y, 0))
        let categoriestotal = Math.round(stats.map((v) => v.categories).reduce((x, y) => x + y, 0))
        if (tooManyRequests) {
            categoriestotal = allData[user.id]?.highestCategories
        }
        const ehttotal = ehptotal + ehbtotal + ehctotal
        const xptotal = Math.round(stats.map((v) => v.XP).reduce((x, y) => x + y, 0) / 1000000)
        response += `📊 <@${user.id}>: EHT: ${ehttotal}, EHP ${ehptotal}, EHB: ${ehbtotal}, XP: ${xptotal}M\n`
        response += `📕 Collection Logs: ${clogstotal}, Categories: ${categoriestotal}, EHC: ${ehctotal}\n\nAccounts\n`
        for (const res of stats) {
            response += `👤 ${res.rsn}: EHT: ${Math.round(res.EHP) + Math.round(res.EHB) + Math.round(res.EHC)}, EHP ${Math.round(res.EHP)}, EHB: ${Math.round(res.EHB)}, XP: ${Math.round(res.XP / 1000000)}M\n`
            response += `📕 Collection Logs: ${res.clogs} (${Math.round(res.clogsPercentage * 1000)/10}%), Categories: ${res.categories}, EHC: ${Math.round(res.EHC)}\n`
        }
        response += `\nTop 3 Skills:\n`
        const skillSorted = Object.entries(skills).sort(([k, v], [kk, vv]) => v < vv ? 1 : v > vv ? -1 : 0)
        for (let i = 0; i < 3; i ++) {
            if (!skillSorted[i]?.length) continue
            response += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${skillSorted[i][0]}: ${Math.round(skillSorted[i][1] / 1000000)}M XP\n`
        }
        response += `\nTop 3 EHP:\n`
        const ehpSorted = Object.entries(ehp).sort(([k, v], [kk, vv]) => v < vv ? 1 : v > vv ? -1 : 0)
        for (let i = 0; i < 3; i ++) {
            if (!ehpSorted[i]?.length) continue
            response += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${ehpSorted[i][0]}: ${Math.round(ehpSorted[i][1])} EHP\n`
        }
        response += `\nTop 3 KC:\n`
        const kcSorted = Object.entries(kc).sort(([k, v], [kk, vv]) => v < vv ? 1 : v > vv ? -1 : 0)
        for (let i = 0; i < 3; i ++) {
            if (!kcSorted[i]?.length) continue
            response += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${kcSorted[i][0]}: ${Math.round(kcSorted[i][1])} KC\n`
        }
        response += `\nTop 3 EHB:\n`
        const ehbSorted = Object.entries(ehb).sort(([k, v], [kk, vv]) => v < vv ? 1 : v > vv ? -1 : 0)
        for (let i = 0; i < 3; i ++) {
            if (!ehbSorted[i]?.length) continue
            response += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${ehbSorted[i][0]}: ${Math.round(ehbSorted[i][1])} EHB\n`
        }
        if (!existsSync(path.join(__dirname, '../../../assets'))) mkdirSync(path.join(__dirname, '../../../assets'))
        let data = {
            updated: new Date().getTime(),
            total,
            userId: user.id,
            ehpMax,
            ehpTotal: ehptotal,
            ehbTotal: ehbtotal,
            ehtTotal: ehttotal,
            ehcTotal: ehctotal,
            percentageMaxXP,
            skills,
            ehp,
            kc,
            stats,
            ehb,
            highestCategories,
            highestClogs,
            highestPercentage,
            xpTotal: xptotal,
            response: response.trim(),
            ehbTop3: ehbSorted.map((v) => ({
                boss: v[0],
                ehb: v[1]
            })),
            ehpTop3: ehpSorted.map((v) => ({
                skill: v[0],
                ehp: v[1]
            })),
            xpTop3: skillSorted.map((v) => ({
                skill: v[0],
                xp: v[1]
            })),
            kcTop3: kcSorted.map((v) => ({
                boss: v[0],
                kc: v[1]
            }))
        }
        if (!existsSync(path.join(__dirname, `../../../assets/all-user-information.json`))) {
            writeFileSync(path.join(__dirname, `../../../assets/all-user-information.json`), JSON.stringify('{}'))
        }
        if (tooManyRequests) {
            data = {
                ...data,
                ehtTotal: Math.max(allData[user.id]?.ehtTotal || 0, data.ehtTotal),
                ehcTotal: Math.max(allData[user.id]?.ehcTotal || 0, data.ehcTotal),
                highestCategories: Math.max(allData[user.id]?.highestCategories || 0, data.highestCategories),
                highestClogs: Math.max(allData[user.id]?.highestClogs || 0, data.highestClogs),
                highestPercentage: Math.max(allData[user.id]?.highestPercentage || 0, data.highestPercentage),
            }
        }
        allData[user.id] = data
        writeFileSync(path.join(__dirname, `../../../assets/all-user-information.json`), JSON.stringify(allData, null, 4))
        return data
    }

    public static checkRank = (totalLevel: number, ehp: number, clogs: number): number => {
        return 0
    }
}