<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\NanuKnowledgeCandidate;
use App\Models\NanuKnowledgeBase;
use App\Services\NanuKnowledgeLearningService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class NanuKnowledgeController extends BaseApiController
{
    protected NanuKnowledgeLearningService $learningService;

    public function __construct(NanuKnowledgeLearningService $learningService)
    {
        $this->learningService = $learningService;
    }

    /**
     * Store a new knowledge candidate (Submitted by any authenticated user).
     */
    public function storeCandidate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'question' => 'required|string|max:1000',
            'answer' => 'required|string|max:5000',
            'module' => 'nullable|string|max:100',
            'title' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation error', $validator->errors(), 422);
        }

        $user = $request->user();
        $candidate = $this->learningService->submitCandidate(
            $user->id,
            $request->input('question'),
            $request->input('answer'),
            $request->input('module'),
            $request->input('title')
        );

        return $this->sendResponse($candidate, 'Knowledge candidate submitted successfully.', 201);
    }

    /**
     * List knowledge candidates (ADMIN/OWNER only).
     */
    public function indexCandidates(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()?->role, ['ADMIN', 'OWNER']), 403, 'Forbidden');

        $perPage = (int) $request->input('per_page', 20);
        $status = $request->input('status');

        $query = NanuKnowledgeCandidate::with(['submitter', 'reviewer'])->latest();

        if ($status) {
            $query->where('status', $status);
        }

        $candidates = $query->paginate($perPage);
        return $this->sendResponse($candidates, 'Knowledge candidates retrieved successfully.');
    }

    /**
     * Review (approve/reject) a candidate (ADMIN/OWNER only).
     */
    public function reviewCandidate(Request $request, string $id): JsonResponse
    {
        abort_unless(in_array($request->user()?->role, ['ADMIN', 'OWNER']), 403, 'Forbidden');

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected',
            'reviewer_notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation error', $validator->errors(), 422);
        }

        $user = $request->user();
        $official = $this->learningService->reviewCandidate(
            $id,
            $user->id,
            $request->input('status'),
            $request->input('reviewer_notes')
        );

        return $this->sendResponse([
            'candidate' => NanuKnowledgeCandidate::with(['submitter', 'reviewer'])->find($id),
            'official_knowledge' => $official,
        ], 'Candidate reviewed successfully.');
    }

    /**
     * List official knowledge base items.
     */
    public function indexOfficial(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);
        $search = $request->input('search');

        $query = NanuKnowledgeBase::query()->latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('question_pattern', 'LIKE', "%{$search}%")
                  ->orWhere('content', 'LIKE', "%{$search}%");
            });
        }

        $knowledge = $query->paginate($perPage);
        return $this->sendResponse($knowledge, 'Official knowledge retrieved successfully.');
    }
}
