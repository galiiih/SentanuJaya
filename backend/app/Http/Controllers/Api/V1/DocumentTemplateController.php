<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\DocumentTemplate;
use App\Models\DocumentTemplateVersion;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class DocumentTemplateController extends BaseApiController
{
    protected function ensureBaselineVersion(DocumentTemplate $template, ?string $userId = null): void
    {
        DB::transaction(function () use ($template, $userId) {
            $locked = DocumentTemplate::where('id', $template->id)->lockForUpdate()->first();
            if ($locked && $locked->versions()->count() === 0) {
                DocumentTemplateVersion::firstOrCreate(
                    [
                        'document_template_id' => $template->id,
                        'version' => $template->version ?? 1,
                    ],
                    [
                        'name' => $template->name,
                        'content' => $template->content,
                        'css' => $template->css,
                        'gjs_project' => $template->gjs_project,
                        'created_by' => $userId ?? $template->created_by,
                    ]
                );
            }
        });
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        $query = DocumentTemplate::query()->latest();

        if ($request->has('document_type')) {
            $query->where('document_type', $request->input('document_type'));
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'document_type' => 'required|string|in:invoice,surat_jalan',
            'format' => 'required|string|in:html,docx,xlsx',
            'content' => 'nullable|required_if:format,html|string',
            'css' => 'nullable|string',
            'gjs_project' => 'nullable|string',
            'file' => 'nullable|file|mimes:html,htm,docx,xlsx|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        return DB::transaction(function () use ($request, $user) {
            $filePath = null;
            $content = $request->input('content');

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $path = $file->store('templates', 'public');
                $filePath = $path;
                if ($request->input('format') === 'html' && empty($content)) {
                    $content = Storage::disk('public')->get($path);
                }
            }

            $template = DocumentTemplate::create([
                'name' => $request->input('name'),
                'document_type' => $request->input('document_type'),
                'format' => $request->input('format'),
                'content' => $content,
                'css' => $request->input('css'),
                'gjs_project' => $request->input('gjs_project'),
                'file_path' => $filePath,
                'version' => 1,
                'status' => 'draft',
                'is_active' => false,
                'created_by' => $user->id,
            ]);

            DocumentTemplateVersion::firstOrCreate(
                [
                    'document_template_id' => $template->id,
                    'version' => 1,
                ],
                [
                    'name' => $template->name,
                    'content' => $template->content,
                    'css' => $template->css,
                    'gjs_project' => $template->gjs_project,
                    'created_by' => $user->id,
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Template created successfully',
                'data' => $template,
            ], 201);
        });
    }

    public function show(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        $this->ensureBaselineVersion($documentTemplate, $user->id);

        return response()->json([
            'status' => 'success',
            'data' => $documentTemplate->load('versions'),
        ]);
    }

    public function update(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|nullable|string',
            'css' => 'sometimes|nullable|string',
            'gjs_project' => 'sometimes|nullable|string',
            'status' => 'sometimes|string|in:draft,active',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        return DB::transaction(function () use ($request, $documentTemplate, $user) {
            $this->ensureBaselineVersion($documentTemplate, $user->id);

            $newVersion = $documentTemplate->version + 1;

            $documentTemplate->update([
                'name' => $request->input('name', $documentTemplate->name),
                'content' => $request->input('content', $documentTemplate->content),
                'css' => $request->input('css', $documentTemplate->css),
                'gjs_project' => $request->input('gjs_project', $documentTemplate->gjs_project),
                'status' => $request->input('status', $documentTemplate->status),
                'version' => $newVersion,
            ]);

            DocumentTemplateVersion::firstOrCreate(
                [
                    'document_template_id' => $documentTemplate->id,
                    'version' => $newVersion,
                ],
                [
                    'name' => $documentTemplate->name,
                    'content' => $documentTemplate->content,
                    'css' => $documentTemplate->css,
                    'gjs_project' => $documentTemplate->gjs_project,
                    'created_by' => $user->id,
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Template updated successfully',
                'data' => $documentTemplate->load('versions'),
            ]);
        });
    }

    public function versions(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        $this->ensureBaselineVersion($documentTemplate, $user->id);

        return response()->json([
            'status' => 'success',
            'data' => $documentTemplate->versions,
        ]);
    }

    public function restoreVersion(Request $request, DocumentTemplate $documentTemplate, int $version): JsonResponse
    {
        return $this->restore($request, $documentTemplate, $version);
    }

    public function restore(Request $request, DocumentTemplate $documentTemplate, int $version): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        return DB::transaction(function () use ($request, $documentTemplate, $version, $user) {
            $this->ensureBaselineVersion($documentTemplate, $user->id);

            $targetVersion = $documentTemplate->versions()->where('version', $version)->first();

            if (!$targetVersion) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Version v{$version} not found for this template.",
                ], 404);
            }

            $newVersion = $documentTemplate->version + 1;

            $documentTemplate->update([
                'name' => $targetVersion->name,
                'content' => $targetVersion->content,
                'css' => $targetVersion->css,
                'gjs_project' => $targetVersion->gjs_project,
                'version' => $newVersion,
            ]);

            DocumentTemplateVersion::firstOrCreate(
                [
                    'document_template_id' => $documentTemplate->id,
                    'version' => $newVersion,
                ],
                [
                    'name' => $documentTemplate->name,
                    'content' => $documentTemplate->content,
                    'css' => $documentTemplate->css,
                    'gjs_project' => $documentTemplate->gjs_project,
                    'created_by' => $user->id,
                ]
            );

            return response()->json([
                'status' => 'success',
                'message' => "Template successfully restored to version v{$version} as new version v{$newVersion}",
                'data' => $documentTemplate->load('versions'),
            ]);
        });
    }

    public function activate(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER'], true), 403, 'Forbidden: Admin or Owner required to activate templates');

        return DB::transaction(function () use ($documentTemplate) {
            DocumentTemplate::where('document_type', $documentTemplate->document_type)
                ->update(['is_active' => false, 'status' => 'draft']);

            $documentTemplate->update([
                'is_active' => true,
                'status' => 'active',
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Template activated successfully',
                'data' => $documentTemplate,
            ]);
        });
    }

    public function destroy(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER'], true), 403, 'Forbidden');

        if ($documentTemplate->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete an active template.',
            ], 422);
        }

        return DB::transaction(function () use ($documentTemplate) {
            $documentTemplate->versions()->delete();
            $documentTemplate->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Template deleted successfully',
            ]);
        });
    }
}
