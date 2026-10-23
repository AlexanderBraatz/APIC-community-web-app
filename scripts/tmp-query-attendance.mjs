import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) throw new Error('Missing Supabase env');

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function findUserIdByEmail(email) {
	const target = email.toLowerCase();
	let page = 1;
	for (;;) {
		const { data, error } = await supabase.auth.admin.listUsers({
			page,
			perPage: 1000,
		});
		if (error) throw error;
		const users = data?.users ?? [];
		const hit = users.find((u) => u.email?.toLowerCase() === target);
		if (hit) return { id: hit.id, email: hit.email };
		if (users.length < 1000) break;
		page += 1;
	}
	return null;
}

const { data: testProfiles, error: profErr } = await supabase
	.from('profiles')
	.select('id, full_name')
	.like('full_name', 'Test-%');
if (profErr) throw profErr;

const testIds = (testProfiles ?? []).map((p) => p.id);
const nameById = Object.fromEntries(
	(testProfiles ?? []).map((p) => [p.id, p.full_name])
);

/** @type {{ full_name: string, title: string, note: string | null, start_date: string, end_date: string }[]} */
let testRows = [];
if (testIds.length) {
	const { data, error } = await supabase
		.from('attendance')
		.select('user_id, title, note, start_date, end_date')
		.in('user_id', testIds)
		.order('start_date', { ascending: true });
	if (error) throw error;
	testRows = (data ?? []).map((r) => ({
		full_name: nameById[r.user_id],
		title: r.title,
		note: r.note,
		start_date: r.start_date,
		end_date: r.end_date,
	}));
}

console.log('=== TEST- PROFILES ===');
console.log(
	'Profile count (full_name starts with Test-):',
	testProfiles?.length ?? 0
);
console.log('Attendance row count:', testRows.length);
console.log(JSON.stringify(testRows, null, 2));

const emails = [
	'alex_braatz@icloud.com',
	'alexander.braatz.creates@gmail.com',
	'thomas.castelfalfi@aol.com',
	'eva_maria_schroeer@gmx.de',
];

console.log('\n=== EXCLUDED / REAL USERS ===');
for (const email of emails) {
	const user = await findUserIdByEmail(email);
	if (!user) {
		console.log(`\n${email}: user not found`);
		continue;
	}
	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name')
		.eq('id', user.id)
		.maybeSingle();
	const { data: rows, error } = await supabase
		.from('attendance')
		.select('title, note, start_date, end_date')
		.eq('user_id', user.id)
		.order('start_date', { ascending: true });
	if (error) throw error;
	console.log(`\n${email} (${profile?.full_name ?? 'no profile'})`);
	console.log('Attendance count:', rows?.length ?? 0);
	console.log(JSON.stringify(rows ?? [], null, 2));
}
