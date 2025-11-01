import { existsSync, mkdirSync, readdirSync, readFile, readFileSync, rmSync, writeFileSync } from "fs"
import path, { join } from "path"
import * as cheerio from 'cheerio'
import Variables from "../../variables"
import Discord from "../discord"
import Bot from "../../bot"
import { ClanApplication } from "../../entities/clan-application"
import { ChatInputCommandInteraction, Guild, Interaction, TextChannel } from "discord.js"

export const Skills = (<Skill extends string>(...skills: Skill[]) => {
    return skills
})(
    'Attack', 'Strength', 'Defence', 'Ranged', 'Prayer', 'Magic', 'Runecraft', 'Hitpoints',
    'Crafting', 'Mining', 'Smithing', 'Fishing', 'Cooking', 'Firemaking', 'Woodcutting', 'Agility',
    'Herblore', 'Thieving', 'Fletching', 'Slayer', 'Farming', 'Construction', 'Hunter', 'Overall'
)
export type Skills = typeof Skills[number]
export type UserStats = {
    updated: number
    clog: {
        categories: {
            green: number,
            total: number,
            percentage: number
        },
        slots: {
            current: {
                temple: number
                hiscores: number
            }
            percentage: number
        },
        hours: {
            played: number,
            percentage: number
        }
    },
    bossing: {
        hours: number,
        bosses: Record<string, {
            hours: number
            kc: number
        }>
    },
    skilling: Record<Skills, {
        hours: {
            played: number,
            percentage: number
        },
        xp: number,
        level: number,
        rank: number
    }> | null
}
export type CacheIndexFile = {
    maxClogs: number,
    records: Record<string, {
        name: string
        updated: number
    }>
}

/**
 * Retrieves stats
 */
export default class Stats {
    /** One hour default max age */
    public static defaultMaxAgeMs: number = 3600 * 1000

    public static readonly main = async(interaction: ChatInputCommandInteraction) => {
        let response = ''
        const user = interaction.options.getUser('user')!
        const apps = await Bot.dataSource.getRepository(ClanApplication).find({
            where: {
                userId: user.id
            }
        })
        const stats = await this.retrieve({
            rsn: apps.filter(v => v.rsn).map((v) => v.rsn) as string[],
            maxAgeMs: 5 * 60 * 1000
        })
        const ehttotal = Object.entries(stats).map(([k, v]) => (v.bossing?.hours || 0) + (v.skilling?.Overall?.hours?.played || 0) + (v.clog?.hours?.played || 0)).reduce((x, y) => x + y, 0)
        const ehptotal = Object.entries(stats).map(([k, v]) => (v.skilling?.Overall?.hours?.played || 0)).reduce((x, y) => x + y, 0)
        const ehbtotal = Object.entries(stats).map(([k, v]) => (v.bossing?.hours || 0)).reduce((x, y) => x + y, 0)
        const xptotal = Object.entries(stats).map(([k, v]) => (v.skilling?.Overall?.hours?.played || 0)).reduce((x, y) => x + y, 0)
        const _skills = Object.entries(stats).filter(([k, v]) => v.skilling).map(([k, v]) => v.skilling)
        const skills: Record<Skills, number> = {} as any
        for (let i = 0; i < _skills.length; i ++) {
            for (const [k, v] of Object.entries(_skills[i]!)) {
                (skills as any)[k] = Math.max((skills as any)[k], v.xp || 0)
            }
        }
        const _ehp = Object.entries(stats).filter(([k, v]) => v.skilling).map(([k, v]) => v.skilling)
        const ehp: Record<Skills, number> = {} as any
        for (let i = 0; i < _ehp.length; i ++) {
            for (const [k, v] of Object.entries(_ehp[i]!)) {
                (ehp as any)[k] = Math.max((ehp as any)[k], v.hours?.played || 0)
            }
        }
        const _kc = Object.entries(stats).filter(([k, v]) => v.bossing?.bosses).map(([k, v]) => v.bossing.bosses)
        const kc: Record<Skills, number> = {} as any
        for (let i = 0; i < _kc.length; i ++) {
            for (const [k, v] of Object.entries(_kc[i]!)) {
                (kc as any)[k] = Math.max((kc as any)[k], v.kc || 0)
            }
        }
        const _ehb = Object.entries(stats).filter(([k, v]) => v.bossing?.bosses).map(([k, v]) => v.bossing.bosses)
        const ehb: Record<Skills, number> = {} as any
        for (let i = 0; i < _ehb.length; i ++) {
            for (const [k, v] of Object.entries(_ehb[i]!)) {
                (ehb as any)[k] = Math.max((ehb as any)[k], v.hours || 0)
            }
        }
        const clogstotal = Object.entries(stats).map(([k, v]) => Math.max((v.clog?.slots?.current?.hiscores || 0), (v.clog?.slots?.current?.temple || 0))).reduce((x, y) => x + y, 0)
        const categoriestotal = Object.entries(stats).map(([k, v]) => (v.clog?.categories?.green || 0)).reduce((x, y) => x + y, 0)
        const ehctotal = Object.entries(stats).map(([k, v]) => (v.clog?.hours?.played || 0)).reduce((x, y) => x + y, 0)

        response += `📊 <@${user.id}>: EHT: ${ehttotal}, EHP ${ehptotal}, EHB: ${ehbtotal}, XP: ${xptotal}M\n`
        response += `📕 Collection Logs: ${clogstotal}, Categories: ${categoriestotal}, EHC: ${ehctotal}\n\nAccounts\n`
        for (const [rsn, res] of Object.entries(stats)) {
            response += `👤 ${rsn}: EHT: ${Math.round(res.skilling?.Overall?.hours?.played || 0) + Math.round(res?.bossing?.hours || 0) + Math.round(res.clog?.hours?.played || 0)}, EHP ${Math.round(res.skilling?.Overall?.hours?.played || 0)}, EHB: ${Math.round(res.bossing?.hours || 0)}, XP: ${Math.round((res.skilling?.Overall?.xp || 0) / 1000000)}M\n`
            response += `📕 Collection Logs: ${Math.max(res.clog?.slots?.current?.hiscores || 0, res.clog?.slots?.current?.temple || 0)} (${Math.round(res.clog?.slots?.percentage * 10)/10}%), Categories: ${res.clog?.categories?.green || 0}, EHC: ${Math.round(res.clog?.hours?.played || 0)}\n`
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
        return await interaction.editReply(response)
    }

    /**
     * Retrieves the stats of one or multiple runescape names through API calls.
     * @param rsns the rsns
     * @returns the stats
     */
    public static readonly retrieve = async<T extends string | U[], U extends string>(options: {
        rsn: T,
        maxAgeMs?: number
    }): Promise<Record<U, UserStats>> => {
        const maxAgeMs = options.maxAgeMs === undefined
            ? this.defaultMaxAgeMs
            : options.maxAgeMs
        const rsns: U[] = Array.isArray(options.rsn)
            ? options.rsn as U[]
            : [options.rsn as string as U]
        const stats: Record<U, UserStats> = {} as any
        for (const rsn of rsns) {
            const temple = await this.retrieveTempleStats({
                maxAgeMs,
                rsn
            })
            if (!temple) continue
            const clog = await this.retrieveClogStats({ rsn, maxAgeMs })
            const ustats: UserStats = {
                updated: new Date().getTime(),
                clog: (typeof clog === 'number' || clog === null)
                    ? {
                        categories: {
                            green: 0,
                            percentage: 0,
                            total: 0
                        },
                        hours: {
                            percentage: 0,
                            played: 0
                        },
                        slots: {
                            current: {
                                temple: 0,
                                hiscores: clog === null ? 0 : clog
                            },
                            percentage: 0
                        }
                    }
                    : clog,
                bossing: temple.bossing,
                skilling: temple.skilling
            }
            stats[rsn] = ustats
        }
        return stats
    }

    private static readonly retrieveTempleStats = async(options: {
        rsn: string,
        maxAgeMs?: number
    }): Promise<{ skilling: UserStats['skilling'], bossing: UserStats['bossing'] } | null> => {
        const res = await this.fetchOrCache<Record<string, any>>({
            url: `https://templeosrs.com/api/player_stats.php?player=${options.rsn}&bosses=1`,
            type: 'json',
            maxAgeMs: options.maxAgeMs
        })
        if (!res) return null
        if (!res.data?.info) return null
        const stats: {
            skilling: UserStats['skilling'],
            bossing: UserStats['bossing']
        } = {
            skilling: {} as any,
            bossing: {
                bosses: {} as any,
                hours: 0
            }
        }
        const ehb = res.data.info.Primary_ehb
        for (const [k, v] of Object.entries(res.data)) {
            if (k.endsWith('_ehp')) {
                const skill = k.replace(/\_ehp$/g, '') as Skills
                (stats.skilling as any)[skill] = {
                    hours: {
                        played: v,
                        percentage: 0
                    },
                    level: res.data[`${skill}_level`],
                    rank: res.data[`${skill}_rank`],
                    xp: res.data[skill]
                }
            }
             if (k.endsWith('_ehb')) {
                const boss = k.replace(/\_ehb$/g, '') as Skills
                (stats.bossing.bosses as any)[boss] = {
                    hours: res.data[`${boss}_ehb`],
                    kc: res.data[`${boss}`]
                } as UserStats['bossing']['bosses'][string]
            }
        }
        stats.bossing.hours = res.data[ehb]
        // Calculate EHP hours
        let percentageMaxXPAccount = 0
        try {
            const res = await this.fetchOrCache({
                url: `https://templeosrs.com/player/stats.php?player=${options.rsn}`,
                type: 'html',
                maxAgeMs: options.maxAgeMs
            })
            if (res) {
                const $ = cheerio.load(res)
                // after loading html with cheerio
                const statsTable = $(".ttm-title-center")
                    .filter((_, el) => $(el).text().includes("Time to 200m all")) // find the correct table
                    .first(); // in case multiple tables match
                if (statsTable.length) {
                    const parentTable = statsTable.closest("#stats-bottom-container");
                    const percentageMaxXP = parseFloat($(parentTable).children('.table-sortable').children('tfoot').children('tr').last().children('td').last().text()?.replace('%', ''))
                    if (percentageMaxXP + percentageMaxXP !== percentageMaxXP && typeof percentageMaxXP === 'number') {
                        percentageMaxXPAccount = Math.max(percentageMaxXP, percentageMaxXPAccount)
                    }
                }
            }
        }
        catch (err) {
            console.error(err)
        }
        if (stats.skilling?.Overall?.hours) {
            stats.skilling.Overall.hours.percentage = percentageMaxXPAccount
        }
        return stats
    }

    private static readonly retrieveClogStats = async(options: {
        rsn: string
        maxAgeMs?: number 
    }): Promise<UserStats['clog'] | number | null> => {
        // Retrieves the file
        const p = ['assets', 'cached', 'fetch']
        this.makeDirectory(...p)
        const fp = [__dirname, '../../../', ...p]
        const indexPath = path.join(...fp, 'index.json')
        if (!existsSync(indexPath)) {
            writeFileSync(indexPath, JSON.stringify({
                id: 0,
                maxClogs: 0,
                records: {}
            } as CacheIndexFile, null, 4))
        }
        this.makeDirectory(...p)
        const cacheFile = JSON.parse(readFileSync(indexPath).toString('utf8')) as CacheIndexFile
        let maxClogs = cacheFile.maxClogs
        const res = {
            temple: await this.fetchOrCache<Record<string, any>>({
                url: `https://templeosrs.com/api/collection-log/player_collection_log.php?player=${options.rsn}&categories=champions_challenge,castle_wars`,
                type: 'json',
                maxAgeMs: options.maxAgeMs
            }),
            osrs: await this.fetchOrCache({
                url: `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(options.rsn)}`,
                type: 'html',
                maxAgeMs: options.maxAgeMs
            })
        }
        if (!res.temple && !res.osrs) {
            return null
        }
        const html = res.osrs
        if (!html) return null
        const $ = cheerio.load(html)
        let clogs = {
            hiscores: 0,
            temple: 0,
            max: 0
        } 
        const parsed = parseInt($(`a[href]`).filter((_, el) => $(el).text().includes('Collections Logged')).first().parent().next().next().text().replace(',', '') || '0')
        if (!!parsed && typeof parsed === 'number' && parsed + parsed !== parsed) {
            clogs.hiscores = parsed
        }
        if (!res.temple?.data) return clogs.hiscores
        clogs.temple = res.temple.data.total_collections_finished
        clogs.max = Math.max(clogs.hiscores, clogs.temple)
        if (!maxClogs) {
            cacheFile.maxClogs = res.temple.data.total_collections_available
            writeFileSync(indexPath, JSON.stringify(cacheFile, null, 4))
        }
        maxClogs = res.temple.data.total_collections_available
        const percentage = clogs.max / maxClogs * 100
        return {
            categories: {
                green: res.temple.data.total_categories_finished,
                percentage: res.temple.data.total_categories_finished / res.temple.data.total_categories_available * 100,
                total: res.temple.data.total_categories_available
            },
            hours: {
                percentage: 0, // TODO:
                played: Math.max(res.temple.data.ehc, res.temple.data.ehc_gilded)
            },
            slots: {
                current: {
                    hiscores: clogs.hiscores,
                    temple: clogs.temple,
                },
                percentage
            }
        }
    }

    /** Updates the hall of fame */
    public static updateHallOfFame = async() => {
        const apps = await Bot.dataSource.getRepository(ClanApplication).find()
        const members = await Stats.fetchOrCache({
            url: `https://templeosrs.com/api/groupmembers.php?id=2305`,
            type: 'json',
            maxAgeMs: 30 * 60 * 1000
        }) as string[]
        const stats = await Stats.retrieve({
            rsn: apps.filter((v) => v.rsn && members.includes(v.rsn)).map((v) => v.rsn) as any,
            maxAgeMs: 60 * 60 * 24 * 1000
        })
        const statsPerUser: Record<string, { rsn: string, stats: UserStats}[]> = {}
        for (const app of apps) {
            if (!app.rsn) continue
            statsPerUser[app.userId] = statsPerUser[app.userId] || []
            statsPerUser[app.userId].push({ rsn: app.rsn, stats: stats[app.rsn] })
        }
        const ehtPerUser = Object.entries(statsPerUser).map((([k, stats]) => stats.map((v) => ({
            eht: (v.stats?.bossing?.hours || 0) + (v.stats?.skilling?.Overall?.hours?.played || 0) + (v.stats?.clog?.hours?.played || 0),
            userId: k
        })))).map((v) => ({ userId: v[0].userId, eht: v.reduce((x, y) => x + y.eht, 0) })).sort((x, y) => y.eht - x.eht)
        const ehpPerUser = Object.entries(statsPerUser).map((([k, stats]) => stats.map((v) => ({
            ehp: (v.stats?.skilling?.Overall?.hours?.played || 0),
            userId: k
        })))).map((v) => ({ userId: v[0].userId, ehp: v.reduce((x, y) => x + y.ehp, 0) })).sort((x, y) => y.ehp - x.ehp)
        const ehbPerUser = Object.entries(statsPerUser).map((([k, stats]) => stats.map((v) => ({
            ehb: (v.stats?.bossing?.hours || 0),
            userId: k
        })))).map((v) => ({ userId: v[0].userId, ehb: v.reduce((x, y) => x + y.ehb, 0) })).sort((x, y) => y.ehb - x.ehb)
        const ehcPerUser = Object.entries(statsPerUser).map((([k, stats]) => stats.map((v) => ({
            ehc: (v.stats?.clog?.hours?.played || 0),
            userId: k
        })))).map((v) => ({ userId: v[0].userId, ehc: v.reduce((x, y) => x + y.ehc, 0) })).sort((x, y) => y.ehc - x.ehc)
        const categoriesPerUser = Object.entries(statsPerUser).map((([k, stats]) => stats.map((v) => ({
            categories: (v.stats?.clog?.categories?.green || 0),
            userId: k
        })))).map((v) => ({ userId: v[0].userId, categories: v.reduce((x, y) => x + y.categories, 0) })).sort((x, y) => y.categories - x.categories)
        const clogsPerUser = Object.entries(statsPerUser).map((([k, stats]) => stats.map((v) => ({
            clogs: Math.max(v.stats?.clog?.slots?.current?.hiscores || 0, v.stats?.clog?.slots?.current?.temple || 0),
            percentage: Math.max(v.stats?.clog?.slots?.current?.hiscores || 0, v.stats?.clog?.slots?.current?.temple || 0),
            userId: k,
            rsn: v.rsn
        })))).flat().sort((x, y) => y.clogs - x.clogs)
        const xpPerUser = Object.entries(statsPerUser).map((([k, stats]) => stats.map((v) => ({
            xp: (v.stats?.skilling?.Overall?.xp || 0),
            userId: k
        })))).map((v) => ({ userId: v[0].userId, xp: v.reduce((x, y) => x + y.xp, 0) })).sort((x, y) => y.xp - x.xp)

        let message1 = `Hey there <@&${Variables.var.ClanMemberRole}>, this is our hall of fame. You can update it by using the /stats command, so get some gains and you'll be on here too!\n\nThe numbers are based on a combined amount from all your accounts in the clan. You can use the \`/stats\` command to check on your own combined stats. Stats per account can be seen on our TempleOSRS page: https://templeosrs.com/groups/members.php?id=2305\n\nWe use TempleOSRS for collection log tracking, so if you want your collection log numbers on this message, then install the templeosrs runelite plugin, open your collection log and click the TempleOSRS sync button. You should then see your collection log information on your TempleOSRS profile too.\n\n`
        message1 += `Top 10 Efficient Hours Total (EHP + EHB + EHC):\n`
        for (let i = 0; i < 10; i ++) {
            if (i > ehtPerUser.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message1 += `${icon} <@${ehtPerUser[i]?.userId}>: ${Math.round(ehtPerUser[i].eht)}\n`
        }
        message1 += `\nTop 10 Efficient Hours Played\n`
        for (let i = 0; i < 10; i ++) {
            if (i > ehpPerUser.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message1 += `${icon} <@${ehpPerUser[i]?.userId}>: ${ehpPerUser[i].ehp}\n`
        }
        message1 += '.'
        let message2 = `Top 10 XP\n`
        for (let i = 0; i < 10; i ++) {
            if (i > xpPerUser.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message2 += `${icon} <@${xpPerUser[i]?.userId}>: ${xpPerUser[i].xp}M XP\n`
        }
        message2 += `\nTop 10 Efficient Hours Bossed\n`
        for (let i = 0; i < 10; i ++) {
            if (i > ehbPerUser.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message2 += `${icon} <@${ehbPerUser[i]?.userId}>: ${ehbPerUser[i].ehb}\n`
        }
        message2 += '.'
        let message3 = `Top 10 Collection Loggers\n`
        for (let i = 0; i < 10; i ++) {
            if (i > clogsPerUser.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message3 += `${icon} <@${clogsPerUser[i].userId}>: ${clogsPerUser[i].clogs} items (${Math.round(clogsPerUser[i].clogs * 1000) / 10}%)\n`
        }
        message3 += `\nTop 10 Collection Categories Completed\n`
        for (let i = 0; i < 10; i ++) {
            if (i > categoriesPerUser.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message3 += `${icon} <@${categoriesPerUser[i].userId}>: ${categoriesPerUser[i].categories} categories\n`
        }
        message3 += `\nTop 10 Efficient Hours Collection Logged\n`
        for (let i = 0; i < 10; i ++) {
            if (i > ehcPerUser.length - 1) continue
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i >= 3 ? `-${i + 1}-` : ''
            message3 += `${icon} <@${ehcPerUser[i].userId}>: ${Math.round(ehcPerUser[i].ehc)} EHC\n`
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

    private static getId = (): number => {
        let maxId = -1
        const p = ['assets', 'cached', 'fetch']
        this.makeDirectory(...p)
        const fp = path.join(...[__dirname, '../../../', ...p, 'index.json'])
        if (!existsSync(fp)) {
            return maxId + 1
        }
        const cache: CacheIndexFile = JSON.parse(readFileSync(fp).toString('utf8'))
        for (const [k, record] of Object.entries(cache.records)) {
            const id = parseInt(record.name.replace(/\..+$/g, ''))
            if (Number.isNaN(id)) continue
            if (!Number.isInteger(id)) continue
            maxId = Math.max(maxId, id)
        }
        return maxId + 1
    }

    /** Fetches or uses data from cache when using `fetch` based on maxAgeMs */
    private static readonly fetchOrCache = async<T extends any = string>(options: {
        url: string,
        type: 'json' | 'html',
        maxAgeMs?: number
    }): Promise<T | null> => {
        const { url, type } = options
        const maxAgeMs: number = options.maxAgeMs === undefined
            ? this.defaultMaxAgeMs
            : options.maxAgeMs

        // Retrieves the file
        const p = ['assets', 'cached', 'fetch']
        const fp = [__dirname, '../../../', ...p]
        this.makeDirectory(...p)

        // Initializes the index file
        const indexFilePath = path.join(...fp, 'index.json')
        if (!existsSync(indexFilePath)) {
            writeFileSync(indexFilePath, JSON.stringify({
                maxClogs: 0,
                records: {}
            } as CacheIndexFile, null, 4))
        }

        // Reads the index file
        let indexFile: CacheIndexFile
        try {
            indexFile = JSON.parse(readFileSync(indexFilePath).toString('utf8'))
        }
        catch (err) {
            console.error(`Index file for fetch cache is corrupted...`, err)
            rmSync(indexFilePath)
            // Retry
            return await this.fetchOrCache({ url, type, maxAgeMs })
        }

        if (maxAgeMs < 0 && !indexFile.records[url]) {
            return null
        }

        else if (maxAgeMs >= 0 && (!indexFile.records[url] || (indexFile.records[url].updated < new Date().getTime() - maxAgeMs))) {
            if (indexFile.records[url] && existsSync(path.join(...fp, indexFile.records[url].name))) {
                rmSync(path.join(...fp, indexFile.records[url].name))
            }
            const res = await fetch(url)
            if (res.status === 200) {
                if (type === 'json') {
                    const data = await res.json()
                    const name = `${this.getId()}.${type}`
                    writeFileSync(path.join(...fp, name), JSON.stringify(data, null, 4))
                    indexFile.records[url] = {
                        name,
                        updated: new Date().getTime()
                    }
                    writeFileSync(indexFilePath, JSON.stringify(indexFile, null, 4))
                    return data as T
                }
                else {
                    const data = await res.text()
                    const name = `${this.getId()}.${type}`
                    writeFileSync(path.join(...fp, name), data)
                    indexFile.records[url] = {
                        name,
                        updated: new Date().getTime()
                    }
                    writeFileSync(indexFilePath, JSON.stringify(indexFile, null, 4))
                    return data as T
                }
            }
            else {
                console.error(`Response status: ${res.statusText} for url "${url}"`)
                return null
            }
        }
        
        if (!existsSync(path.join(...fp, indexFile.records[url].name))) {
            delete indexFile.records[url]
            writeFileSync(indexFilePath, JSON.stringify(indexFile, null, 4))
            return await this.fetchOrCache({ url, type, maxAgeMs })
        }

        return options.type === 'json'
            ? JSON.parse(readFileSync(path.join(...fp, indexFile.records[url].name)).toString('utf8'))
            : readFileSync(path.join(...fp, indexFile.records[url].name)).toString('utf8') as T
    }

    /**
     * Makes a directory recursively
     * @param directories the path
     */
    private static readonly makeDirectory = async(...directories: string[]) => {
        let cd = path.join(__dirname, '../../../')
        for (let i = 0; i < directories.length; i ++) {
            const segment = directories[i]
            const segmentPath = path.join(cd, segment)
            if (!existsSync(segmentPath)) {
                mkdirSync(segmentPath)
            }
            cd = segmentPath
        }
    }
}