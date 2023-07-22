import { error } from '@sveltejs/kit';

import supabase from '$lib/supabase';
import { getDiscordToken } from '$lib/verification';
import { RequestErrorType } from '$lib/enums';
import type { RequestError } from '$lib/types';
import type { PageServerLoad } from './$types';
import { createMellowServerDiscordRedirectUrl } from '$lib/util';
export const config = { regions: ['iad1'] };
export const load = (async ({ url, parent }) => {
	const { session } = await parent();
	const response = await supabase.from('mellow_servers').select<string, {
		id: string
		name: string
		members: { id: string }[]
		avatar_url: string
	}>('id, name, avatar_url, members:mellow_server_members!inner ( id )').in('members.user_id', [session!.user.id]);
	if (response.error) {
		console.error(response.error);
		throw error(500, JSON.stringify({ error: RequestErrorType.ExternalRequestError } satisfies RequestError));
	}

	let allServers: {
		id: string
		name: string
		icon: string | null
		owner: boolean
		features: string[]
		permissions: string
		approximate_member_count: number
		approximate_presence_count: number
	}[] = [];
	const code = url.searchParams.get('code');
	if (code && session) {
		const response = await getDiscordToken(code, createMellowServerDiscordRedirectUrl(url.origin));
		if (!response.success) {
			console.error(response.error);
			throw error(500, JSON.stringify({ error: RequestErrorType.ExternalRequestError } satisfies RequestError));
		}

		const response2 = await fetch('https://discord.com/api/v10/users/@me/guilds', {
			headers: {
				authorization: `${response.data.token_type} ${response.data.access_token}`
			}
		}).then(response => response.json());
		const response3 = await supabase.from('mellow_user_servers').upsert({
			data: response2,
			user_id: session.user.id
		}, { onConflict: 'user_id' });
		if (response3.error) {
			console.error(response3.error);
			throw error(500, JSON.stringify({ error: RequestErrorType.ExternalRequestError } satisfies RequestError));
		}

		allServers = response2;
	} else if (session) {
		const response = await supabase.from('mellow_user_servers').select('data').eq('user_id', session.user.id).limit(1).maybeSingle();
		if (response.error) {
			console.error(response.error);
			throw error(500, JSON.stringify({ error: RequestErrorType.ExternalRequestError } satisfies RequestError));
		}

		allServers = response.data?.data ?? [];
	}

	return { servers: response.data, allServers };
}) satisfies PageServerLoad;