import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759218572326 implements MigrationInterface {
    name = 'Migration1759218572326'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`twitter\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`twitter\``);
    }

}
