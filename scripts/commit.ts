import { execSync } from "child_process"
import { writeFileSync } from "fs"
import path from "path"
const commit = process.argv.filter((v, i) => i > 1).join(' ')
console.log(commit)

if (commit.length) {
    writeFileSync(path.join(__dirname, '../assets/commits/', new Date().toISOString() + '.txt'), commit)
    execSync(`git add . && git commit -m "${commit}" && git push`)
}
else {
    execSync(`git add . && git commit -m "This is a patch of previous commit." && git push`)
}