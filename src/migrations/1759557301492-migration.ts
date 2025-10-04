import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1759557301492 implements MigrationInterface {
    name = 'Migration1759557301492'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`userId\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`channel\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`messageIdTrialists\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`rsn\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`approved\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`trial\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`messageIdExpelAsap\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`twitter\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`notifiedAboutRank\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`userLeft\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`archived\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`key\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`value\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`userId\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`rsn\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`channel\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`messageIdTrialists\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`messageIdExpelAsap\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`approved\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`trial\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`twitter\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`notifiedAboutRank\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`userLeft\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`archived\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`streamKey\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`streamKey\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`archived\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`userLeft\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`notifiedAboutRank\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`twitter\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`trial\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`approved\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`messageIdExpelAsap\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`messageIdTrialists\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`channel\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`rsn\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`userId\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`value\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` DROP COLUMN \`key\``);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`archived\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`userLeft\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`notifiedAboutRank\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`twitter\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`messageIdExpelAsap\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`trial\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`approved\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`rsn\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`messageIdTrialists\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`channel\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clan-applications\` ADD \`userId\` varchar(255) NOT NULL`);
    }

}
