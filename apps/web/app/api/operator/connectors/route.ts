import { NextRequest, NextResponse } from 'next/server';

import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserById } from '../../../../lib/db';
import { isAdminEmail } from '../../../../lib/admin-emails';
import { getConnectorStatuses } from '../../../../lib/connector-health';

async function authorize(req: NextRequest): Promise<boolean> {
  const session = readSessionFromRequest(req);
  if (!session?.userId) return false;
  const user = await getUserById(session.userId);
  return !!(user?.email && isAdminEmail(user.email));
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const connectors = await getConnectorStatuses();
  return NextResponse.json({ connectors });
}
