import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import Variables from "../src/variables"
Variables.loadEnv(process.env.NODE_ENV)
console.log(process.env.MYSQL_PASSWORD)