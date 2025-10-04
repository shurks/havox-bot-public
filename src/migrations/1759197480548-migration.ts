import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759197480548 implements MigrationInterface {
    name = 'Migration1759197480548'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`rankIcon\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`messageIdTrialists\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`messageIdTrialists\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`rankIcon\``);
    }

}
