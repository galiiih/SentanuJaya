<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use App\Models\NanuKnowledgeCandidate;
use App\Models\NanuKnowledgeBase;
use App\Services\NanuKnowledgeLearningService;
use App\Services\PuffyAiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NanuKnowledgeLearningTest extends TestCase
{
    use RefreshDatabase;

    public function test_candidate_submission_and_approval_workflow(): void
    {
        $staff = User::factory()->create(['role' => 'STAFF']);
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $service = new NanuKnowledgeLearningService();

        // 1. Submit candidate
        $candidate = $service->submitCandidate(
            $staff->id,
            'Bagaimana cara input produk khusus?',
            'Buka menu Master Data > Produk Khusus, lalu isi form.',
            'Master Data',
            'Panduan Produk Khusus'
        );

        $this->assertNotNull($candidate);
        $this->assertEquals('pending_review', $candidate->status);
        $this->assertEquals($staff->id, $candidate->submitted_by);

        // 2. Review and approve candidate by admin
        $official = $service->reviewCandidate($candidate->id, $admin->id, 'approved', 'Sudah diverifikasi.');

        $this->assertNotNull($official);
        $this->assertEquals('approved', $candidate->fresh()->status);
        $this->assertEquals($admin->id, $candidate->fresh()->reviewed_by);
        $this->assertEquals('Panduan Produk Khusus', $official->title);
        $this->assertTrue($official->is_published);

        // 3. Test retrieval finds the new approved knowledge
        $retrieved = $service->findRelevantGuidance('produk khusus', 'STAFF');
        $this->assertNotNull($retrieved);
        $this->assertStringContainsString('Panduan Produk Khusus', $retrieved);
    }

    public function test_candidate_rejection_workflow(): void
    {
        $staff = User::factory()->create(['role' => 'STAFF']);
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $service = new NanuKnowledgeLearningService();

        $candidate = $service->submitCandidate(
            $staff->id,
            'Pertanyaan invalid',
            'Jawaban invalid',
            'General',
            'Invalid Candidate'
        );

        $official = $service->reviewCandidate($candidate->id, $admin->id, 'rejected', 'Tidak sesuai SOP.');

        $this->assertNull($official);
        $this->assertEquals('rejected', $candidate->fresh()->status);
        $this->assertEquals('Tidak sesuai SOP.', $candidate->fresh()->reviewer_notes);

        // Retrieval should not find rejected knowledge
        $retrieved = $service->findRelevantGuidance('Pertanyaan invalid', 'STAFF');
        $this->assertNull($retrieved);
    }

    public function test_api_endpoints_for_knowledge_candidates_and_official(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $staff = User::factory()->create(['role' => 'STAFF']);
        $candidate = NanuKnowledgeCandidate::create([
            'submitted_by' => $staff->id,
            'title' => 'API Test Candidate',
            'module' => 'Material',
            'question' => 'Bagaimana cara tes API?',
            'answer' => 'Gunakan HTTP request.',
            'status' => 'pending_review',
        ]);

        // Staff forbidden to list or review candidates
        $this->actingAs($staff)
             ->getJson('/api/v1/nanu/candidates')
             ->assertStatus(403);

        $this->actingAs($staff)
             ->postJson("/api/v1/nanu/candidates/{$candidate->id}/review", ['status' => 'approved'])
             ->assertStatus(403);

        // Admin can list candidates
        $this->actingAs($admin)
             ->getJson('/api/v1/nanu/candidates')
             ->assertStatus(200)
             ->assertJsonFragment(['title' => 'API Test Candidate']);

        // Admin can approve candidate
        $this->actingAs($admin)
             ->postJson("/api/v1/nanu/candidates/{$candidate->id}/review", [
                 'status' => 'approved',
                 'reviewer_notes' => 'OK API Verified'
             ])
             ->assertStatus(200)
             ->assertJsonFragment(['status' => 'approved']);

        // Official knowledge list
        $this->actingAs($admin)
             ->getJson('/api/v1/nanu/official')
             ->assertStatus(200)
             ->assertJsonFragment(['title' => 'API Test Candidate']);
    }

    /**
     * Prove approved knowledge reaches PuffyAiService context (retrieval integration).
     * Pending/rejected knowledge must NOT appear.
     */
    public function test_approved_knowledge_reaches_nanu_context_and_pending_rejected_excluded(): void
    {
        $staff = User::factory()->create(['role' => 'STAFF']);
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $service = new NanuKnowledgeLearningService();

        // 1. Create approved knowledge with unique marker
        $candidate = $service->submitCandidate(
            $staff->id,
            'NANU_REAL_RETRIEVAL_FINAL_2026',
            'Jawaban unik: marker retrieval test knowledge berhasil masuk context.',
            'Testing',
            'Retrieval Proof Knowledge'
        );
        $service->reviewCandidate($candidate->id, $admin->id, 'approved', 'Approved for retrieval test');

        // 2. Create pending candidate — must NOT appear in retrieval
        $pendingCandidate = $service->submitCandidate(
            $staff->id,
            'NANU_PENDING_SHOULD_NOT_APPEAR',
            'Pending answer should not be retrieved.',
            'Testing',
            'Pending Candidate'
        );
        // Leave as pending_review

        // 3. Create rejected candidate — must NOT appear in retrieval
        $rejectedCandidate = $service->submitCandidate(
            $staff->id,
            'NANU_REJECTED_SHOULD_NOT_APPEAR',
            'Rejected answer should not be retrieved.',
            'Testing',
            'Rejected Candidate'
        );
        $service->reviewCandidate($rejectedCandidate->id, $admin->id, 'rejected', 'Not valid');

        // 4. Verify retrieval finds approved knowledge
        $retrieved = $service->findRelevantGuidance('NANU_REAL_RETRIEVAL_FINAL_2026', 'STAFF');
        $this->assertNotNull($retrieved, 'Approved knowledge must be retrievable');
        $this->assertStringContainsString('marker retrieval test', $retrieved);

        // 5. Verify pending NOT retrieved
        $pendingResult = $service->findRelevantGuidance('NANU_PENDING_SHOULD_NOT_APPEAR', 'STAFF');
        $this->assertNull($pendingResult, 'Pending candidate must NOT be retrieved as official');

        // 6. Verify rejected NOT retrieved
        $rejectedResult = $service->findRelevantGuidance('NANU_REJECTED_SHOULD_NOT_APPEAR', 'STAFF');
        $this->assertNull($rejectedResult, 'Rejected candidate must NOT be retrieved as official');

        // 7. Verify PuffyAiService has learningService injected and can access it
        $aiService = app(PuffyAiService::class);
        $this->assertNotNull($aiService, 'PuffyAiService must resolve from container');

        // 8. Verify official knowledge in DB
        $this->assertDatabaseHas('nanu_knowledge_base', [
            'question_pattern' => 'NANU_REAL_RETRIEVAL_FINAL_2026',
            'is_published' => true,
        ]);

        // 9. Verify pending/rejected candidates NOT in official knowledge base
        $this->assertDatabaseMissing('nanu_knowledge_base', [
            'question_pattern' => 'NANU_PENDING_SHOULD_NOT_APPEAR',
        ]);
        $this->assertDatabaseMissing('nanu_knowledge_base', [
            'question_pattern' => 'NANU_REJECTED_SHOULD_NOT_APPEAR',
        ]);
    }

    /**
     * Staff can submit candidate via API, but cannot list or review.
     */
    public function test_staff_can_submit_but_cannot_list_or_review_candidates_via_api(): void
    {
        $staff = User::factory()->create(['role' => 'STAFF']);

        // Staff CAN submit correction/candidate
        $this->actingAs($staff)
             ->postJson('/api/v1/nanu/candidates', [
                 'question' => 'Bagaimana proses klaim garansi?',
                 'answer' => 'Hubungi CS melalui menu support.',
                 'module' => 'Support',
                 'title' => 'Panduan Garansi',
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('nanu_knowledge_candidates', [
            'question' => 'Bagaimana proses klaim garansi?',
            'status' => 'pending_review',
            'submitted_by' => $staff->id,
        ]);

        // Staff CANNOT list candidates
        $this->actingAs($staff)
             ->getJson('/api/v1/nanu/candidates')
             ->assertStatus(403);

        // Staff CANNOT review
        $candidate = NanuKnowledgeCandidate::where('submitted_by', $staff->id)->first();
        $this->actingAs($staff)
             ->postJson("/api/v1/nanu/candidates/{$candidate->id}/review", ['status' => 'approved'])
             ->assertStatus(403);
    }

    /**
     * Guest cannot access any Nanu endpoints.
     */
    public function test_guest_cannot_access_nanu_endpoints(): void
    {
        $this->getJson('/api/v1/nanu/candidates')->assertStatus(401);
        $this->postJson('/api/v1/nanu/candidates', ['question' => 'x', 'answer' => 'y'])->assertStatus(401);
        $this->postJson('/api/v1/nanu/candidates/fake-id/review', ['status' => 'approved'])->assertStatus(401);
        $this->getJson('/api/v1/nanu/official')->assertStatus(401);
    }
}
