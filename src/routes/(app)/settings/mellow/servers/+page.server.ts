import { requestError } from '$lib/util/server';
import { getDiscordToken } from '$lib/verification';
import { RequestErrorType } from '$lib/enums';
import type { PageServerLoad } from './$types';
import supabase, { handleResponse } from '$lib/supabase';
import { createMellowServerDiscordRedirectUrl } from '$lib/util';

export const config = { regions: ['iad1'], runtime: 'edge' };
export const load = (async ({ url, parent }) => {
	const { session } = await parent();
	const response = await supabase.rpc('website_get_user_mellow_servers2', {
		target_user_id: session!.sub
	});
	handleResponse(response);

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
			throw requestError(500, RequestErrorType.ExternalRequestError);
		}

		const response2 = await fetch('https://discord.com/api/v10/users/@me/guilds', {
			headers: {
				authorization: `${response.data.token_type} ${response.data.access_token}`
			}
		}).then(response => response.json());
		const response3 = await supabase.from('mellow_user_servers').upsert({
			data: response2,
			user_id: session.sub
		}, { onConflict: 'user_id' });
		if (response3.error) {
			console.error(response3.error);
			throw requestError(500, RequestErrorType.ExternalRequestError);
		}

		allServers = response2;
	} else if (session) {
		const response = await supabase.from('mellow_user_servers').select('data').eq('user_id', session.sub).limit(1).maybeSingle();
		if (response.error) {
			console.error(response.error);
			throw requestError(500, RequestErrorType.ExternalRequestError);
		}

		allServers = response.data?.data ?? [];
	}

	return { servers: response.data as { id: string, name: string, avatar_url: string | null }[], allServers };
}) satisfies PageServerLoad;