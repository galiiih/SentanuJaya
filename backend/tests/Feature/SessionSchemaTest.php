<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SessionSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_user_id_accepts_uuid_primary_keys(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $column = collect(DB::select("PRAGMA table_info('sessions')"))
                ->firstWhere('name', 'user_id');
            $this->assertNotNull($column);
            $this->assertContains(strtolower($column->type), ['varchar', 'text', 'char', 'string']);
        } else {
            $type = \Illuminate\Support\Facades\Schema::getColumnType('sessions', 'user_id');
            $this->assertContains(strtolower($type), ['string', 'varchar', 'char', 'uuid', 'text']);
        }

        // Functional verification: insert and retrieve a session with a UUID user_id
        $sessionId = Str::random(40);
        $uuidUserId = (string) Str::uuid();

        DB::table('sessions')->insert([
            'id' => $sessionId,
            'user_id' => $uuidUserId,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'TestAgent',
            'payload' => 'test-payload',
            'last_activity' => time(),
        ]);

        $session = DB::table('sessions')->where('id', $sessionId)->first();
        $this->assertNotNull($session);
        $this->assertEquals($uuidUserId, (string) $session->user_id);
    }
}
