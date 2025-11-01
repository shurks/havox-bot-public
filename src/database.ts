import { configDotenv } from "dotenv"
import path from "path"
import { DataSource } from "typeorm"
import Variables from "./variables"
Variables.loadEnv(process.env.NODE_ENV)

export default new DataSource({
    type: 'mysql',
    host: String(process.env.MYSQL_HOST),
    port: 3306,
    username: String(process.env.MYSQL_USERNAME),
    password: String(process.env.MYSQL_PASSWORD),
    database: String(process.env.MYSQL_DATABASE),
    synchronize: false,
    logging: false,
    entities: [__dirname + '/entities/*.ts'],
    migrations: [__dirname + "/migrations/*.ts"],
    migrationsTableName: '_migrations',
    migrationsTransactionMode: 'all',
    migrationsRun: true,
    extra: {
        multipleStatements: true // ✅ allows executing multiple queries at once
    }
})