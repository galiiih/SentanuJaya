<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\DocumentTemplate;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class DocumentTemplateController extends BaseApiController
{
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
            'file' => 'nullable|file|mimes:html,htm,docx,xlsx|max:5120', // max 5MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

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
            'file_path' => $filePath,
            'version' => 1,
            'status' => 'draft',
            'is_active' => false,
            'created_by' => $user->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Template created successfully',
            'data' => $template,
        ], 201);
    }

    public function show(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        return response()->json([
            'status' => 'success',
            'data' => $documentTemplate,
        ]);
    }

    public function update(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER', 'STAFF'], true), 403, 'Forbidden');

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|nullable|string',
            'status' => 'sometimes|string|in:draft,active',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $newVersion = $documentTemplate->version + 1;

        $documentTemplate->update([
            'name' => $request->input('name', $documentTemplate->name),
            'content' => $request->input('content', $documentTemplate->content),
            'status' => $request->input('status', $documentTemplate->status),
            'version' => $newVersion,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Template updated successfully',
            'data' => $documentTemplate,
        ]);
    }

    public function activate(Request $request, DocumentTemplate $documentTemplate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && in_array($user->role, ['ADMIN', 'OWNER'], true), 403, 'Forbidden: Admin or Owner required to activate templates');

        // Deactivate all templates of the same document type
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

        $documentTemplate->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Template deleted successfully',
        ]);
    }
}
