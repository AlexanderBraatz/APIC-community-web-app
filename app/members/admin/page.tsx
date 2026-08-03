import { redirect } from 'next/navigation';

export default function MembersAdminIndexPage() {
	redirect('/members/admin/invitations');
}
