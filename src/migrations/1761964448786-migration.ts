import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1761964448786 implements MigrationInterface {
    name = 'Migration1761964448786'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` varchar(255) NOT NULL, \`channel\` varchar(255) NULL, \`messageIdTrialists\` varchar(255) NULL, \`messageIdExpelAsap\` varchar(255) NULL, \`approved\` tinyint NULL, \`trial\` tinyint NULL, \`twitter\` varchar(255) NULL, \`userLeft\` tinyint NULL, \`archived\` tinyint NULL, \`streamKey\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
