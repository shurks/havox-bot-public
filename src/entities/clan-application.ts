import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import Variables from "../variables";

@Entity("clan-applications")
export class ClanApplication {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false })
    userId: string;

    @Column({ nullable: true, type: 'varchar' })
    rsn: string | null = null

    @Column({ nullable: true, type: 'varchar' })
    channel: string | null = null

    /**
     * The message id in trialists
     */
    @Column({ nullable: true, type: 'varchar' })
    messageIdTrialists: string | null = null

    /**
     * The message id in expel asap
     */
    @Column({ nullable: true, type: 'varchar' })
    messageIdExpelAsap: string | null = null

    /**
     * Whether or not the member is approved to be on trial
     */
    @Column({ nullable: true, type: 'tinyint' })
    approved: boolean = false

    /** Is the member on trial? */
    @Column({ nullable: true, type: 'tinyint' })
    trial: boolean = false

    /** Twitter */
    @Column({ nullable: true, type: 'varchar' })
    twitter: string | null = null

    /** Whether the staff was notified about rank up the clan applicant deserves */
    @Column({ nullable: true, type: 'varchar' })
    notifiedAboutRank: keyof typeof Variables.var.Emojis | null = null

    /** Did the user leave? */
    @Column({ nullable: true, type: 'tinyint' })
    userLeft: boolean = false

    /** Is the user archived? (banned) */
    @Column({ nullable: true, type: 'tinyint' })
    archived: boolean = false

    @Column({ nullable: true, type: 'varchar' })
    streamKey: string | null = null
}
