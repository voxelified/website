import { redirect } from '@sveltejs/kit';

import type { UserSessionJWT } from '$lib/shared/types';
import { getUserNotifications } from '$lib/server/database';
import supabase, { handle_response } from '$lib/server/supabase';
export async function load({ url, locals: { session }, cookies }) {
	const user = session ? await getUser(session) : null;
	if (session && !user) {
		cookies.delete('auth-token', { path: '/', domain: '.hakumi.cafe' });
		throw redirect(302, `/sign-in?redirect_uri=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const notifications = session ? await getUserNotifications(session.sub) : [];
	return {
		user,
		session,
		notifications
	};
}

async function getUser(session: UserSessionJWT) {
	const response = await supabase.from('users')
		.select<string, {
			id: string
			name: string | null
			username: string
			avatar_url: string | null
			created_at: string
			teams: {
				team: {
					id: string
					name: string
					owner_id: string | null
					avatar_url: string | null
					display_name: string | null
				}
				role: {
					permissions: number
				} | null
			}[]
		}>('id, name, username, avatar_url, created_at, teams:team_members!team_members_user_id_fkey ( team:teams ( id, name, owner_id, avatar_url, display_name ), role:team_roles ( permissions ) )')
		.eq('id', session.sub)
		.limit(1)
		.maybeSingle();
	handle_response(response);

	return response.data!;
}