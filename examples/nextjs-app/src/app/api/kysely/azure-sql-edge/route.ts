import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {ConnectionUtils, createDialect} from "@flowblade/source-kysely";
import {dbKysely} from "../../../../server/config/db.kysely.config";
import {sql} from "kysely";

export const dynamic = 'force-dynamic';


export async function GET(
  _req: NextRequest
) {
    const row = await sql<{
        name: string,
        id: number
    }>`
       select 'world' as name, 1 as id
    `.execute(dbKysely);

    return NextResponse.json({
      hello: 'world',
      db: row.rows
    }
  );
}
