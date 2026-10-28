import { createClient } from '@supabase/supabase-js';

/**
 * Launch data cleanup: keep board + alex_braatz, delete test users/stays.
 *
 * Usage (repo root):
 *   node --env-file=.env.local scripts/launch-data-cleanup.mjs
 *   node --env-file=.env.local scripts/launch-data-cleanup.mjs --execute
 */

const KEEP_EMAILS = new Set(
	[
		'alex_braatz@icloud.com',
		'jgodwinpga@icloud.com',
		'cscapparino@gmail.com',
		'thomas.castelfalfi@aol.com',
		'eva_maria_schroeer@gmx.de',
		'cjstratmann@hotmail.com',
		'dwalsh10@me.com'
	].map(e => e.toLowerCase())
);

/** Alex test attendance rows to scrub (leave christmas). */
const ALEX_TEST_ATTENDANCE_IDS = [
	'd65bbc0e-7a10-4be6-8466-5f729b26320f', // Aug 10–14
	'4e4ed547-7ced-4fab-abc4-7829fbc7a559', // Aug 16–22
	'efca035a-7add-461f-9df3-ca8eddbe9e13' // the past test
];

const JUNK_BLOG_TITLES = new Set(['m', 'x', 'n', 'Example']);

function requireEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing ${name}`);
	}
	return value;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function listAllAuthUsers(supabase) {
	const pageSize = 1000;
	let page = 1;
	/** @type {import('@supabase/supabase-js').User[]} */
	const all = [];
	for (;;) {
		const { data, error } = await supabase.auth.admin.listUsers({
			page,
			perPage: pageSize
		});
		if (error) {
			throw new Error(`listUsers failed: ${error.message}`);
		}
		const users = data?.users ?? [];
		all.push(...users);
		if (users.length < pageSize) break;
		page += 1;
	}
	return all;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
async function removeAvatar(supabase, userId) {
	const candidates = ['jpg', 'png', 'webp', 'gif'].map(
		ext => `${userId}/avatar.${ext}`
	);
	const { error } = await supabase.storage.from('avatars').remove(candidates);
	if (error) {
		console.warn(`  avatar cleanup warning for ${userId}: ${error.message}`);
	}
}

async function main() {
	const execute = process.argv.includes('--execute');
	const mode = execute ? 'EXECUTE' : 'DRY-RUN';

	const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
	const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
	const supabase = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	console.log(`\n=== Launch data cleanup (${mode}) ===\n`);

	// --- Preflight ---
	const authUsers = await listAllAuthUsers(supabase);
	const { data: profiles, error: profilesError } = await supabase
		.from('profiles')
		.select('id, full_name, role, avatar_url')
		.order('full_name');
	if (profilesError) {
		throw new Error(`profiles: ${profilesError.message}`);
	}

	const emailById = new Map(
		authUsers.map(u => [u.id, (u.email ?? '').toLowerCase()])
	);
	const profileById = new Map((profiles ?? []).map(p => [p.id, p]));

	/** @type {{ id: string, email: string, full_name: string, role: string }[]} */
	const keepUsers = [];
	/** @type {{ id: string, email: string, full_name: string, role: string }[]} */
	const deleteUsers = [];

	for (const profile of profiles ?? []) {
		const email = emailById.get(profile.id) ?? '';
		const row = {
			id: profile.id,
			email,
			full_name: profile.full_name || '(no name)',
			role: profile.role
		};
		if (KEEP_EMAILS.has(email)) {
			keepUsers.push(row);
		} else {
			deleteUsers.push(row);
		}
	}

	const keepEmailsFound = new Set(keepUsers.map(u => u.email));
	const missingKeep = [...KEEP_EMAILS].filter(e => !keepEmailsFound.has(e));
	if (missingKeep.length > 0) {
		throw new Error(
			`Keep-list emails missing from DB: ${missingKeep.join(', ')}`
		);
	}

	const keepAdmins = keepUsers.filter(u => u.role === 'admin');
	if (keepAdmins.length < 2) {
		throw new Error(
			`Expected at least 2 keep admins after cleanup; found ${keepAdmins.length}`
		);
	}

	const alex = keepUsers.find(u => u.email === 'alex_braatz@icloud.com');
	if (!alex) {
		throw new Error('alex_braatz@icloud.com not found');
	}

	const { data: attendance, error: attendanceError } = await supabase
		.from('attendance')
		.select('id, user_id, title, start_date, end_date')
		.order('start_date');
	if (attendanceError) {
		throw new Error(`attendance: ${attendanceError.message}`);
	}

	const deleteIds = new Set(deleteUsers.map(u => u.id));
	const alexTestStays = (attendance ?? []).filter(a =>
		ALEX_TEST_ATTENDANCE_IDS.includes(a.id)
	);
	const staysCascading = (attendance ?? []).filter(a =>
		deleteIds.has(a.user_id)
	);
	const staysKept = (attendance ?? []).filter(
		a =>
			!deleteIds.has(a.user_id) &&
			!ALEX_TEST_ATTENDANCE_IDS.includes(a.id)
	);

	const { count: listingsCount, error: listingsError } = await supabase
		.from('listings')
		.select('id', { count: 'exact', head: true });
	if (listingsError) {
		throw new Error(`listings count: ${listingsError.message}`);
	}

	const { data: blogPosts, error: blogError } = await supabase
		.from('blog_posts')
		.select('id, title, status, deleted_at')
		.order('title');
	if (blogError) {
		throw new Error(`blog_posts: ${blogError.message}`);
	}

	const junkBlogs = (blogPosts ?? []).filter(
		p =>
			JUNK_BLOG_TITLES.has(p.title) &&
			p.status !== 'deleted'
	);
	const publishedBlogs = (blogPosts ?? []).filter(p => p.status === 'published');

	const { data: pendingInvites, error: inviteError } = await supabase
		.from('user_invitations')
		.select('id, email, status')
		.eq('status', 'pending');
	if (inviteError) {
		throw new Error(`invitations: ${inviteError.message}`);
	}

	const pendingToCancel = (pendingInvites ?? []).filter(
		inv => !KEEP_EMAILS.has((inv.email ?? '').toLowerCase())
	);
	const pendingToKeep = (pendingInvites ?? []).filter(inv =>
		KEEP_EMAILS.has((inv.email ?? '').toLowerCase())
	);

	console.log('KEEP users (%d):', keepUsers.length);
	for (const u of keepUsers.sort((a, b) => a.email.localeCompare(b.email))) {
		console.log(`  [${u.role}] ${u.full_name} <${u.email}>`);
	}

	console.log('\nDELETE users (%d):', deleteUsers.length);
	const deleteOrdered = [
		...deleteUsers.filter(u => u.role !== 'admin'),
		...deleteUsers.filter(u => u.role === 'admin')
	];
	for (const u of deleteOrdered) {
		console.log(`  [${u.role}] ${u.full_name} <${u.email}>`);
	}

	console.log('\nAlex test stays to scrub (%d):', alexTestStays.length);
	for (const s of alexTestStays) {
		console.log(
			`  ${s.id.slice(0, 8)}… "${s.title}" ${s.start_date}→${s.end_date}`
		);
	}

	console.log(
		'\nStays cascading with deleted users (%d):',
		staysCascading.length
	);
	console.log('Stays kept after cleanup (%d):', staysKept.length);
	for (const s of staysKept) {
		const email = emailById.get(s.user_id) ?? '?';
		console.log(
			`  "${s.title}" ${s.start_date}→${s.end_date} <${email}>`
		);
	}

	console.log('\nJunk blog drafts to soft-delete (%d):', junkBlogs.length);
	for (const p of junkBlogs) {
		console.log(`  [${p.status}] "${p.title}" ${p.id}`);
	}
	console.log('Published blogs to keep (%d):', publishedBlogs.length);
	for (const p of publishedBlogs) {
		console.log(`  "${p.title}"`);
	}

	console.log('\nPending invites to keep (%d):', pendingToKeep.length);
	for (const inv of pendingToKeep) {
		console.log(`  ${inv.email}`);
	}
	console.log('Pending invites to cancel (%d):', pendingToCancel.length);
	for (const inv of pendingToCancel) {
		console.log(`  ${inv.email}`);
	}

	console.log('\nListings count (unchanged):', listingsCount ?? 0);
	console.log(
		'Expected after: %d profiles, %d attendance rows, %d published blogs',
		keepUsers.length,
		staysKept.length,
		publishedBlogs.length
	);

	if (deleteUsers.length !== 16) {
		console.warn(
			`\nWarning: expected 16 delete users, found ${deleteUsers.length}`
		);
	}
	if (staysKept.length !== 4) {
		console.warn(
			`Warning: expected 4 kept attendance rows, found ${staysKept.length}`
		);
	}

	if (!execute) {
		console.log(
			'\nDry-run only. Re-run with --execute to apply changes.\n'
		);
		return;
	}

	console.log('\n--- Applying changes ---\n');

	// Step 2: scrub Alex test stays
	if (alexTestStays.length > 0) {
		const { error } = await supabase
			.from('attendance')
			.delete()
			.in(
				'id',
				alexTestStays.map(s => s.id)
			);
		if (error) {
			throw new Error(`scrub Alex stays: ${error.message}`);
		}
		console.log(`Deleted ${alexTestStays.length} Alex test attendance row(s).`);
	}

	// Step 3: delete non-keep users (non-admins first)
	for (const user of deleteOrdered) {
		const { error: reassignError } = await supabase
			.from('user_invitations')
			.update({ invited_by: alex.id })
			.eq('invited_by', user.id);
		if (reassignError) {
			throw new Error(
				`reassign invites for ${user.email}: ${reassignError.message}`
			);
		}

		const profile = profileById.get(user.id);
		if (profile?.avatar_url) {
			await removeAvatar(supabase, user.id);
		}

		const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
			user.id
		);
		if (deleteAuthError) {
			throw new Error(
				`deleteUser ${user.email}: ${deleteAuthError.message}`
			);
		}
		console.log(`Deleted ${user.email}`);
	}

	// Step 4: soft-delete junk blog drafts
	if (junkBlogs.length > 0) {
		const now = new Date().toISOString();
		const { error } = await supabase
			.from('blog_posts')
			.update({ status: 'deleted', deleted_at: now })
			.in(
				'id',
				junkBlogs.map(p => p.id)
			);
		if (error) {
			throw new Error(`soft-delete blogs: ${error.message}`);
		}
		console.log(`Soft-deleted ${junkBlogs.length} junk blog draft(s).`);
	}

	// Step 5: cancel non-keep pending invites
	if (pendingToCancel.length > 0) {
		const now = new Date().toISOString();
		const { error } = await supabase
			.from('user_invitations')
			.update({ status: 'cancelled', cancelled_at: now })
			.in(
				'id',
				pendingToCancel.map(i => i.id)
			);
		if (error) {
			throw new Error(`cancel invites: ${error.message}`);
		}
		console.log(`Cancelled ${pendingToCancel.length} pending invite(s).`);
	}

	// Step 6: verify
	console.log('\n--- Verification ---\n');

	const { data: profilesAfter, error: profilesAfterError } = await supabase
		.from('profiles')
		.select('id, full_name, role');
	if (profilesAfterError) {
		throw new Error(`verify profiles: ${profilesAfterError.message}`);
	}

	const authAfter = await listAllAuthUsers(supabase);
	const emailAfter = new Map(
		authAfter.map(u => [u.id, (u.email ?? '').toLowerCase()])
	);
	const emailsAfter = (profilesAfter ?? [])
		.map(p => emailAfter.get(p.id) ?? '')
		.sort();

	console.log('Profiles remaining (%d):', profilesAfter?.length ?? 0);
	for (const p of profilesAfter ?? []) {
		console.log(
			`  [${p.role}] ${p.full_name} <${emailAfter.get(p.id) ?? '?'}>`
		);
	}

	const { data: attendanceAfter, error: attAfterError } = await supabase
		.from('attendance')
		.select('id, title, start_date, end_date, user_id')
		.order('start_date');
	if (attAfterError) {
		throw new Error(`verify attendance: ${attAfterError.message}`);
	}
	console.log('\nAttendance remaining (%d):', attendanceAfter?.length ?? 0);
	for (const s of attendanceAfter ?? []) {
		console.log(
			`  "${s.title}" ${s.start_date}→${s.end_date} <${emailAfter.get(s.user_id) ?? '?'}>`
		);
	}

	const { count: listingsAfter } = await supabase
		.from('listings')
		.select('id', { count: 'exact', head: true });
	const { data: publishedAfter } = await supabase
		.from('blog_posts')
		.select('id, title')
		.eq('status', 'published');
	const { count: adminCount } = await supabase
		.from('profiles')
		.select('id', { count: 'exact', head: true })
		.eq('role', 'admin');

	console.log('\nListings:', listingsAfter ?? 0);
	console.log(
		'Published blogs:',
		(publishedAfter ?? []).map(p => p.title).join(', ')
	);
	console.log('Admins remaining:', adminCount ?? 0);

	const okProfiles = (profilesAfter?.length ?? 0) === 7;
	const okEmails =
		emailsAfter.length === 7 &&
		[...KEEP_EMAILS].every(e => emailsAfter.includes(e));
	const okAttendance = (attendanceAfter?.length ?? 0) === 4;
	const okListings = (listingsAfter ?? 0) === (listingsCount ?? 0);
	const okPublished = (publishedAfter?.length ?? 0) === 2;
	const okAdmins = (adminCount ?? 0) >= 1;

	if (
		!okProfiles ||
		!okEmails ||
		!okAttendance ||
		!okListings ||
		!okPublished ||
		!okAdmins
	) {
		console.error('\nVerification FAILED:');
		if (!okProfiles) console.error('  - profile count != 7');
		if (!okEmails) console.error('  - keep emails mismatch');
		if (!okAttendance) console.error('  - attendance count != 4');
		if (!okListings) console.error('  - listings count changed');
		if (!okPublished) console.error('  - published blogs != 2');
		if (!okAdmins) console.error('  - no admin left');
		process.exitCode = 1;
		return;
	}

	console.log('\nVerification OK. Launch cleanup complete.\n');
}

main().catch(err => {
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
});
