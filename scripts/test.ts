import { existsSync, writeFileSync } from "fs";
import Bot from "../src/bot";
import { ClanApplication } from "../src/entities/clan-application";
import path from "path";
import Discord from "../src/discord/discord";
import Variables from "../src/variables";
import ProcessAllMembersTask from "../src/discord/tasks/process-all-members-task";
import { Metadata } from "../src/entities/metadata";
import Stats from "../src/discord/commands/stats";

//ASC
// console.log([1, 2, 3].sort((a, b) => a - b))

Bot.initializeDataSource().then(async() => {
    // const repos = {
    //     app: Bot.dataSource.getRepository(ClanApplication),
    //     metadata: Bot.dataSource.getRepository(Metadata)
    // }
    // const metadata = await repos.metadata.find()
    // for (const m of metadata) {
    //     (Variables.env as any)[m.key] = m.value
    // }
    // await Discord.main(true)
    // const apps = await repos.app.find()
    // if (!existsSync(path.join(__dirname, './apps.json'))) {
    //     writeFileSync(path.join(__dirname, './apps.json'), JSON.stringify(apps, null, 4))
    // }
    writeFileSync(path.join(__dirname, './test.json'), JSON.stringify(((await Stats.retrieve({
        rsn: [
            'kerkhof',
            'lijk'
        ],
        maxAgeMs: 0
    }))['kerkhof']), null, 4))
})