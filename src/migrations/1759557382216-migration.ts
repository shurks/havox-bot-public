import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759557382216 implements MigrationInterface {
    name = 'Migration1759557382216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`metadata\` (\`id\` int NOT NULL AUTO_INCREMENT, \`key\` varchar(255) NOT NULL, \`value\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`key\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`value\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`value\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`key\` varchar(255) NOT NULL`);
        await queryRunner.query(`DROP TABLE \`metadata\``);
    }

}
