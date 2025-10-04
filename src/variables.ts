import { configDotenv } from "dotenv"
configDotenv()
export default class Variables {
    public static env: Record<Env, string> = {} as any
    public static get var() {
        return {
        Emojis: {
            ClanFriend: {
                id: String(Variables.env.IconIDClanFriend),
                label: 'Starter',
                role: String(Variables.env.IconRoleClanFriend),
                req: {
                    total: null,
                    ehp: null,
                    ca: null,
                    clogs: null
                }
            },
            Recruit: {
                id: String(Variables.env.IconIDRecruit),
                label: 'Recruit',
                role: String(Variables.env.IconRoleRecruit),
                req: {
                    total: 1500,
                    ehp: 100,
                    ca: null,
                    clogs: null
                }
            },
            Corporal: {
                id: String(Variables.env.IconIDCorporal),
                label: 'Corporal',
                role: String(Variables.env.IconRoleCorporal),
                req: {
                    total: 1750,
                    ehp: 200,
                    ca: null,
                    clogs: null
                }
            },
            Sergeant: {
                id: String(Variables.env.IconIDSergeant),
                label: 'Sergeant',
                role: String(Variables.env.IconRoleSergeant),
                req: {
                    total: 2000,
                    ehp: 300,
                    ca: null,
                    clogs: null
                }
            },
            Lieutenant: {
                id: String(Variables.env.IconIDLieutenant),
                label: 'Lieutenant',
                role: String(Variables.env.IconRoleLieutenant),
                req: {
                    total: 2100,
                    ehp: 500,
                    ca: null,
                    clogs: null
                }
            },
            Captain: {
                id: String(Variables.env.IconIDCaptain),
                label: 'Captain',
                role: String(Variables.env.IconRoleCaptain),
                req: {
                    total: 2200,
                    ehp: 750,
                    ca: 'Hard',
                    clogs: null
                }
            },
            General: {
                id: String(Variables.env.IconIDGeneral),
                label: 'General',
                role: String(Variables.env.IconRoleGeneral),
                req: {
                    total: 2277,
                    ehp: 1000,
                    ca: null,
                    clogs: 600
                }
            },
            Officer: {
                id: String(Variables.env.IconIDOfficer),
                label: 'Officer',
                role: String(Variables.env.IconRoleOfficer),
                req: {
                    total: null,
                    ehp: 1500,
                    ca: null,
                    clogs: 700
                }
            },
            Commander: {
                id: String(Variables.env.IconIDCommander),
                label: 'Commander',
                role: String(Variables.env.IconRoleCommander),
                req: {
                    total: null,
                    ehp: 2000,
                    ca: null,
                    clogs: 800
                }
            },
            Colonel: {
                id: String(Variables.env.IconIDColonel),
                label: 'Colonel',
                role: String(Variables.env.IconRoleColonel),
                req: {
                    total: null,
                    ehp: 2500,
                    ca: null,
                    clogs: 900
                }
            },
            Brigadier: {
                id: String(Variables.env.IconIDBrigadier),
                label: 'Brigadier',
                role: String(Variables.env.IconRoleBrigadier),
                req: {
                    total: null,
                    ehp: 3000,
                    ca: null,
                    clogs: 950
                }
            },
            Admiral: {
                id: String(Variables.env.IconIDAdmiral),
                label: 'Admiral',
                role: String(Variables.env.IconRoleAdmiral),
                req: {
                    total: null,
                    ehp: 3500,
                    ca: 'Master',
                    clogs: 1000
                }
            },
            Champion: {
                id: String(Variables.env.IconIDChampion),
                label: 'Champion',
                role: String(Variables.env.IconRoleChampion),
                req: {
                    total: null,
                    ehp: 5000,
                    ca: null,
                    clogs: '70%'
                }
            },
            Hero: {
                id: String(Variables.env.IconIDHero),
                label: 'Hero',
                role: String(Variables.env.IconRoleHero),
                req: {
                    total: null,
                    ehp: '50%',
                    ca: null,
                    clogs: '75%'
                }
            },
            Legend: {
                id: String(Variables.env.IconIDLegend),
                label: 'Legend',
                role: String(Variables.env.IconRoleLegend),
                req: {
                    total: null,
                    ehp: '65%',
                    ca: null,
                    clogs: '80%'
                }
            },
            Myth: {
                id: String(Variables.env.IconIDMyth),
                label: 'Myth',
                role: String(Variables.env.IconRoleMyth),
                req: {
                    total: null,
                    ehp: '80%',
                    ca: null,
                    clogs: '85%'
                }
            },
            Clogger: {
                id: String(Variables.env.IconIDClogger),
                label: 'Collector (90%)',
                role: String(Variables.env.IconRoleClogger),
                req: {
                    total: null,
                    ehp: null,
                    ca: null,
                    clogs: '90%'
                }
            },
            Skiller: {
                id: String(Variables.env.IconIDSkiller),
                label: 'Skiller (200M all)',
                role: String(Variables.env.IconRoleSkiller),
                req: {
                    total: null,
                    ehp: '100%',
                    ca: null,
                    clogs: null
                }
            },
            Grandmaster: {
                id: String(Variables.env.IconIDGrandmaster),
                label: 'Grandmaster',
                role: String(Variables.env.IconRoleGrandmaster),
                req: {
                    total: null,
                    ehp: null,
                    ca: 'Grandmaster',
                    clogs: null
                }
            }
        },
        ApplyChannel: String(Variables.env.APPLY_CHANNEL_ID),
        ApplicantsChannel: String(Variables.env.APPLICANTS_CHANNEL_ID),
        ClanApplicationsCategory: String(Variables.env.CLAN_APPLICATIONS_CATEGORY),
        StaffRole: String(Variables.env.STAFF_ROLE),
        OwnerRole: String(Variables.env.OWNER_ROLE),
        AppRole: String(Variables.env.APP_ROLE),
        ClanMemberRole: String(Variables.env.CLAN_MEMBER_ROLE),
        ClanFriendRole: String(Variables.env.CLAN_FRIEND_ROLE),
        StreamChatChannel: String(Variables.env.STREAM_CHAT_CHANNEL),
        CommunityMemberRole: String(Variables.env.COMMUNITY_MEMBER_ROLE),
        Guild: String(Variables.env.GUILD_ID),
        TrialistsChannel: String(Variables.env.TRIALISTS_CHANNEL_ID),
        NewMembersChannel: String(Variables.env.NEW_MEMBERS_CHANNEL_ID),
        ExpelASAPChannel: String(Variables.env.EXPEL_ASAP_CHANNEL_ID),
        MembersCategory: String(Variables.env.MEMBERS_CATEGORY_ID),
        MemesChannel: String(Variables.env.MEMES_CHANNEL_ID),
        RareDropsChannel: String(Variables.env.RARE_DROPS_CHANNEL_ID),
        AchievementsChannel: String(Variables.env.ACHIEVEMENTS_CHANNEL_ID),
        RankupsChannel: String(Variables.env.RANKUPS_CHANNEL_ID),
        AllroundIronmanChannel: String(Variables.env.ALLROUND_IRONMAN_CHANNEL_ID),
        ArchiveCategory: String(Variables.env.ARCHIVE_CATEGORY),
        
        // One week
        TrialDurationMs: 1000 * 3600 * 24 * 7
    }
}
}