import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759791325792 implements MigrationInterface {
    name = 'Migration1759791325792'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`radio-bot\` (\`id\` int NOT NULL AUTO_INCREMENT, \`channel\` varchar(255) NOT NULL, \`token\` varchar(255) NOT NULL, \`appId\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`radio-bot\``);
    }

}
