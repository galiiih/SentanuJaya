<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\ErpDocumentation;
use App\Models\ErpDocumentationCategory;
use App\Models\ErpDocumentationFeedback;
use App\Models\ErpDocumentationVersion;
use App\Models\NanuKnowledgeAuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ErpDocumentationController extends BaseApiController
{
    private function roleRank(?string $role): int
    {
        return match ($role) {
            'STAFF' => 1,
            'OWNER' => 2,
            'ADMIN' => 3,
            'DEV', 'DEV ADMIN' => 4,
            default => 0,
        };
    }

    private function canManage(Request $request): bool
    {
        return in_array($request->user()?->role, ['OWNER', 'ADMIN', 'DEV', 'DEV ADMIN'], true);
    }

    private function audit(Request $request, string $type, string $id, string $action, ?array $before, ?array $after): void
    {
        NanuKnowledgeAuditLog::create([
            'actor_id' => $request->user()?->id,
            'entity_type' => $type,
            'entity_id' => $id,
            'action' => $action,
            'before_state' => $before,
            'after_state' => $after,
        ]);
    }

    public function categories(Request $request): JsonResponse
    {
        $categories = ErpDocumentationCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->withCount(['articles as published_articles_count' => fn ($q) => $q->where('publication_status', 'published')])
            ->get();

        return $this->sendResponse($categories, 'Kategori dokumentasi berhasil dimuat.');
    }

    public function index(Request $request): JsonResponse
    {
        $allowedRoles = match ($this->roleRank($request->user()?->role)) {
            1 => ['STAFF'],
            2 => ['STAFF', 'OWNER'],
            3 => ['STAFF', 'OWNER', 'ADMIN'],
            4 => ['STAFF', 'OWNER', 'ADMIN', 'DEV', 'DEV ADMIN'],
            default => [],
        };

        $query = ErpDocumentation::query()
            ->with('category:id,name,slug')
            ->where('publication_status', 'published')
            ->whereNotNull('published_at')
            ->whereIn('minimum_role', $allowedRoles);

        if ($request->filled('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->string('category')));
        }
        if ($request->filled('module')) {
            $query->where('module_key', $request->string('module'));
        }
        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $like = '%' . addcslashes($term, '%_') . '%';
            $query->where(fn ($q) => $q->where('title', 'ILIKE', $like)
                ->orWhere('summary', 'ILIKE', $like)
                ->orWhere('body_markdown', 'ILIKE', $like)
                ->orWhereRaw('keywords::text ILIKE ?', [$like]));
        }

        return $this->sendResponse($query->orderByDesc('published_at')->paginate(min(max($request->integer('per_page', 20), 1), 100)), 'Dokumentasi berhasil dimuat.');
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $article = ErpDocumentation::query()
            ->with(['category:id,name,slug', 'versions', 'feedback'])
            ->where('slug', $slug)
            ->where('publication_status', 'published')
            ->whereNotNull('published_at')
            ->firstOrFail();

        abort_unless($this->roleRank($request->user()?->role) >= $this->roleRank($article->minimum_role), 403, 'Anda tidak memiliki akses ke artikel ini.');

        $related = collect($article->related_slugs ?? [])->isEmpty()
            ? collect()
            : ErpDocumentation::query()->whereIn('slug', $article->related_slugs)
                ->where('publication_status', 'published')->whereNotNull('published_at')
                ->get(['id', 'slug', 'title', 'summary']);

        return $this->sendResponse(['article' => $article, 'related' => $related], 'Artikel dokumentasi berhasil dimuat.');
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($this->canManage($request), 403, 'Anda tidak memiliki izin mengelola dokumentasi.');
        $data = $request->validate([
            'category_id' => 'nullable|uuid|exists:erp_documentation_categories,id',
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|alpha_dash|unique:erp_documentation,slug',
            'summary' => 'nullable|string|max:1000',
            'body_markdown' => 'required|string',
            'module_key' => 'nullable|string|max:100',
            'keywords' => 'nullable|array',
            'related_slugs' => 'nullable|array',
            'minimum_role' => 'nullable|in:STAFF,OWNER,ADMIN,DEV,DEV ADMIN',
        ]);

        return DB::transaction(function () use ($request, $data) {
            $data['slug'] = $data['slug'] ?: Str::slug($data['title']);
            $data['created_by'] = $request->user()->id;
            $data['updated_by'] = $request->user()->id;
            $article = ErpDocumentation::create($data);
            ErpDocumentationVersion::create([
                'documentation_id' => $article->id,
                'version' => 1,
                'title' => $article->title,
                'summary' => $article->summary,
                'body_markdown' => $article->body_markdown,
                'change_summary' => ['reason' => 'Initial draft'],
                'created_by' => $request->user()->id,
            ]);
            $this->audit($request, 'documentation', $article->id, 'created', null, $article->only(['title', 'slug', 'publication_status']));
            return $this->sendResponse($article, 'Draft dokumentasi berhasil dibuat.', 201);
        });
    }

    public function update(Request $request, string $id): JsonResponse
    {
        abort_unless($this->canManage($request), 403, 'Anda tidak memiliki izin mengelola dokumentasi.');
        $data = $request->validate([
            'category_id' => 'sometimes|nullable|uuid|exists:erp_documentation_categories,id',
            'title' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|required|string|max:255|alpha_dash|unique:erp_documentation,slug,' . $id,
            'summary' => 'sometimes|nullable|string|max:1000',
            'body_markdown' => 'sometimes|required|string',
            'module_key' => 'sometimes|nullable|string|max:100',
            'keywords' => 'sometimes|array',
            'related_slugs' => 'sometimes|array',
            'minimum_role' => 'sometimes|in:STAFF,OWNER,ADMIN,DEV,DEV ADMIN',
            'change_note' => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($request, $id, $data) {
            $article = ErpDocumentation::query()->lockForUpdate()->findOrFail($id);
            $before = $article->only(['title', 'slug', 'summary', 'body_markdown', 'publication_status', 'current_version']);
            $changeNote = $data['change_note'] ?? 'Content updated';
            unset($data['change_note']);
            $nextVersion = $article->current_version + 1;
            $article->fill($data);
            $article->current_version = $nextVersion;
            $article->updated_by = $request->user()->id;
            $article->save();

            ErpDocumentationVersion::create([
                'documentation_id' => $article->id,
                'version' => $nextVersion,
                'title' => $article->title,
                'summary' => $article->summary,
                'body_markdown' => $article->body_markdown,
                'change_summary' => ['reason' => $changeNote],
                'created_by' => $request->user()->id,
            ]);
            $this->audit($request, 'documentation', $article->id, 'updated', $before, $article->only(['title', 'slug', 'publication_status', 'current_version']));
            return $this->sendResponse($article, 'Dokumentasi berhasil diperbarui dan versi baru dibuat.');
        });
    }

    public function publish(Request $request, string $id): JsonResponse
    {
        abort_unless(in_array($request->user()?->role, ['ADMIN', 'DEV', 'DEV ADMIN'], true), 403, 'Hanya ADMIN atau DEV ADMIN yang dapat mempublikasikan dokumentasi.');
        $article = DB::transaction(function () use ($request, $id) {
            $record = ErpDocumentation::query()->lockForUpdate()->findOrFail($id);
            $before = $record->only(['publication_status', 'published_at']);
            $record->update(['publication_status' => 'published', 'published_at' => now(), 'updated_by' => $request->user()->id]);
            $this->audit($request, 'documentation', $record->id, 'published', $before, $record->only(['publication_status', 'published_at']));
            return $record;
        });
        return $this->sendResponse($article, 'Dokumentasi berhasil dipublikasikan.');
    }

    public function feedback(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['was_helpful' => 'required|boolean', 'comment' => 'nullable|string|max:2000']);
        $article = ErpDocumentation::query()->where('id', $id)->where('publication_status', 'published')->firstOrFail();
        abort_unless($this->roleRank($request->user()?->role) >= $this->roleRank($article->minimum_role), 403);
        $feedback = ErpDocumentationFeedback::updateOrCreate(
            ['documentation_id' => $article->id, 'user_id' => $request->user()->id],
            $data
        );
        return $this->sendResponse($feedback, 'Feedback dokumentasi berhasil disimpan.');
    }
}
