<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SessionSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_user_id_accepts_uuid_primary_keys(): void
    {
        $column = collect(DB::select("PRAGMA table_info('sessions')"))
            ->firstWhere('name', 'user_id');

        $this->assertSame('varchar', $column->type);
    }
}
