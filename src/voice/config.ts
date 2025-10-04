type Config = {
	device: string;
	maxTransmissionGap: number;
	type: string;
};

export const config: Config = {
	device: '19', // 'rtmp://hurx.io:8000/live/live_867127323_2T3j2esgHV6HmrGUlAGloLjWEK64O4stan',
	maxTransmissionGap: 5_000,
	type: 'pulse',
};