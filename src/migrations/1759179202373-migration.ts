import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759179202373 implements MigrationInterface {
    name = 'Migration1759179202373'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clan-applications\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` varchar(255) NOT NULL, \`channel\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`approval-message\` (\`id\` int NOT NULL AUTO_INCREMENT, \`clanApplicationId\` int NOT NULL, \`messageId\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`approval-message\``);
        await queryRunner.query(`DROP TABLE \`clan-applications\``);
    }

}
