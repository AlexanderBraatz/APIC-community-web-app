import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Wipe + recreate Castelfalfi community Auth users and attendance (service role).
 *
 * Usage (repo root):
 *   node --env-file=.env.local scripts/seed-attendance.mjs
 *   npm run seed:attendance
 */

function requireEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing ${name}`);
	}
	return value;
}

function loadSeed() {
	const path = resolve(
		process.cwd(),
		'scripts/data/castelfalfi-attendance-seed.json'
	);
	return JSON.parse(readFileSync(path, 'utf8'));
}

/** Exclusive DayPilot end (yyyy-MM-dd) → inclusive DB end_date. */
function exclusiveEndToInclusive(endExclusive) {
	const d = new Date(`${endExclusive}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().slice(0, 10);
}

function memberEmail(base, domain, slug) {
	return `${base}+${slug}@${domain}`.toLowerCase();
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Set<string>} emailSet
 */
async function wipeSeedUsers(supabase, emailSet) {
	const pageSize = 1000;
	let page = 1;
	/** @type {{ id: string, email: string }[]} */
	const toDelete = [];

	for (;;) {
		const { data, error } = await supabase.auth.admin.listUsers({
			page,
			perPage: pageSize
		});
		if (error) {
			throw new Error(`listUsers failed: ${error.message}`);
		}
		const users = data?.users ?? [];
		for (const user of users) {
			const email = user.email?.toLowerCase();
			if (email && emailSet.has(email)) {
				toDelete.push({ id: user.id, email });
			}
		}
		if (users.length < pageSize) break;
		page += 1;
	}

	for (const user of toDelete) {
		const { error } = await supabase.auth.admin.deleteUser(user.id);
		if (error) {
			throw new Error(`deleteUser ${user.email}: ${error.message}`);
		}
		console.log(`Deleted ${user.email}`);
	}

	return toDelete.length;
}

async function main() {
	const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
	const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
	const supabase = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	const seed = loadSeed();
	const members = seed.members ?? [];
	const stays = seed.stays ?? [];
	if (!Array.isArray(members) || members.length === 0) {
		throw new Error('No members in seed file');
	}
	if (!Array.isArray(stays) || stays.length === 0) {
		throw new Error('No stays in seed file');
	}

	const emailBase = seed.emailLocalBase ?? 'braatzgerman';
	const emailDomain = seed.emailDomain ?? 'gmail.com';
	const password = seed.password ?? '12345678910';

	const bySlug = new Map(members.map(m => [m.slug, m]));
	for (const stay of stays) {
		if (!bySlug.has(stay.slug)) {
			throw new Error(`Stay references unknown slug: ${stay.slug}`);
		}
	}

	const emails = members.map(m =>
		memberEmail(emailBase, emailDomain, m.slug)
	);
	const emailSet = new Set(emails);

	console.log(`Wiping up to ${emailSet.size} seed emails…`);
	const deleted = await wipeSeedUsers(supabase, emailSet);
	console.log(`Deleted ${deleted} existing seed user(s).`);

	/** @type {Map<string, string>} slug -> user id */
	const userIds = new Map();

	for (const member of members) {
		const email = memberEmail(emailBase, emailDomain, member.slug);
		const { data, error } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { full_name: member.full_name }
		});
		if (error || !data?.user?.id) {
			throw new Error(
				`createUser ${email}: ${error?.message ?? 'no user returned'}`
			);
		}
		userIds.set(member.slug, data.user.id);
		console.log(`Created ${email} → ${data.user.id} (${member.full_name})`);
	}

	const rows = stays.map(stay => {
		const member = bySlug.get(stay.slug);
		const userId = userIds.get(stay.slug);
		const endDate = exclusiveEndToInclusive(stay.endExclusive);
		if (stay.start > endDate) {
			throw new Error(
				`Invalid range for ${stay.slug}: ${stay.start} > ${endDate} (from exclusive ${stay.endExclusive})`
			);
		}
		return {
			user_id: userId,
			title: (stay.title?.trim() || member.full_name).slice(0, 200),
			note: stay.note?.trim() ? stay.note.trim() : null,
			start_date: stay.start,
			end_date: endDate
		};
	});

	const { data: inserted, error: insertError } = await supabase
		.from('attendance')
		.insert(rows)
		.select('id, user_id, title, start_date, end_date');

	if (insertError) {
		throw new Error(`attendance insert: ${insertError.message}`);
	}

	const vespa = (inserted ?? []).find(r => r.title === 'Vespa tour');
	if (vespa) {
		console.log(
			`Spot-check Vespa tour: ${vespa.start_date} → ${vespa.end_date} (expect end 2026-09-04)`
		);
	}

	console.log(
		`Done: ${userIds.size} users, ${inserted?.length ?? 0} attendance rows.`
	);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
