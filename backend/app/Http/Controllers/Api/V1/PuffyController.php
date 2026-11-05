<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\PuffyConversation;
use App\Models\PuffyMessage;
use App\Models\PuffyFeedback;
use App\Models\PuffyPendingAction;
use App\Models\PuffyAuditLog;
use App\Services\PuffyAiService;
use App\Services\PuffyKnowledgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PuffyController extends BaseApiController
{
    protected PuffyAiService $aiService;
    protected PuffyKnowledgeService $knowledgeService;

    public function __construct(PuffyAiService $aiService, PuffyKnowledgeService $knowledgeService)
    {
        $this->aiService = $aiService;
        $this->knowledgeService = $knowledgeService;
    }

    /**
     * Handle SSE Chat streaming.
     */
    public function chat(Request $request): StreamedResponse
    {
        $request->validate([
            'message' => 'required|string|max:2000',
            'conversation_id' => 'nullable|string',
            'page_context' => 'nullable|array',
        ]);

        $user = $request->user();
        $messageText = $request->input('message');
        $conversationId = $request->input('conversation_id');
        $pageContext = $request->input('page_context', []);

        // Find or create conversation
        if ($conversationId) {
            $conversation = PuffyConversation::where('id', $conversationId)
                ->where('user_id', $user->id)
                ->first();
            if (!$conversation) {
                $conversation = PuffyConversation::create([
                    'id' => Str::uuid(),
                    'user_id' => $user->id,
                    'title' => Str::limit($messageText, 40),
                ]);
            }
        } else {
            $conversation = PuffyConversation::create([
                'id' => Str::uuid(),
                'user_id' => $user->id,
                'title' => Str::limit($messageText, 40),
            ]);
        }

        // Save user message
        PuffyMessage::create([
            'id' => Str::uuid(),
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'role' => 'user',
            'content' => $messageText,
            'metadata' => $pageContext,
        ]);

        $responseId = (string) Str::uuid();

        return response()->stream(function () use ($messageText, $conversation, $user, $responseId, $pageContext) {
            // Streaming AI requests may legitimately outlive PHP's default 30-second
            // execution limit while Ollama loads a cold model into memory.
            if (function_exists('set_time_limit')) {
                set_time_limit(0);
            }

            // Disable output buffering
            if (ob_get_level()) {
                ob_end_flush();
            }

            $sendEvent = function (string $event, array $data) {
                echo "event: {$event}\n";
                echo "data: " . json_encode($data) . "\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            };

            // Agentic chat execution with history, native tool calling, and robust stream parsing
            $fullContext = array_merge($pageContext, [
                'user_name' => $user->name,
                'role' => $user->role ?? 'STAFF',
                'user_id' => (string) $user->id,
            ]);

            $result = $this->aiService->agenticChat(
                $messageText,
                $conversation->id,
                $fullContext,
                function (string $label, array $ui) use ($sendEvent) {
                    $sendEvent('status', ['label' => $label, 'ui' => $ui]);
                },
                function (array $toolResult) use ($sendEvent) {
                    $sendEvent('tool_result', $toolResult);
                },
                function (string $token) use ($sendEvent) {
                    $sendEvent('token', ['text' => $token]);
                }
            );

            $replyText = $result['reply'] ?? '';
            $toolResultData = $result['tool_result'] ?? null;

            // Save assistant message
            PuffyMessage::create([
                'id' => $responseId,
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
                'role' => 'assistant',
                'content' => $replyText,
                'tool_result' => $toolResultData,
            ]);

            // Done event
            $sendEvent('done', [
                'message_id' => $responseId,
                'conversation_id' => $conversation->id,
            ]);

        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    /**
     * Store feedback for a message.
     */
    public function feedback(Request $request)
    {
        $request->validate([
            'message_id' => 'required|string|exists:puffy_messages,id',
            'value' => 'required|in:up,down',
        ]);

        $user = $request->user();
        $messageId = $request->input('message_id');
        $value = $request->input('value');

        $message = PuffyMessage::where('id', $messageId)->first();
        if (!$message || $message->conversation->user_id !== $user->id) {
            return $this->sendError('Pesan tidak ditemukan atau bukan milik Anda.', [], 403);
        }

        $feedback = PuffyFeedback::updateOrCreate(
            ['message_id' => $messageId, 'user_id' => $user->id],
            ['value' => $value]
        );

        return $this->sendResponse($feedback, 'Feedback berhasil disimpan.');
    }

    /**
     * Create an allowlisted Customer PO activation draft.
     */
    public function createAction(Request $request)
    {
        $validated = $request->validate([
            'action_type' => 'required|in:customer_po.activate',
            'payload.po_id' => 'required|uuid|exists:customer_pos,id',
        ]);

        $user = $request->user();
        abort_unless($user?->hasPermission('po.activate'), 403, __('auth.unauthorized'));

        $po = \\App\\Models\\CustomerPo::with(['customer', 'lines'])->findOrFail($validated['payload']['po_id']);
        if ($po->status !== \\App\\Models\\CustomerPo::STATUS_DRAFT) {
            return $this->sendError("Customer PO harus berstatus DRAFT. Status saat ini: {$po->status}.", [], 422);
        }
        if ($po->lines->isEmpty()) {
            return $this->sendError('Customer PO tidak memiliki item.', [], 422);
        }

        $action = PuffyPendingAction::create([
            'id' => Str::uuid(),
            'user_id' => $user->id,
            'action_type' => 'customer_po.activate',
            'payload' => [
                'po_id' => $po->id,
                'po_number' => $po->po_number,
                'customer_name' => $po->customer?->name,
                'expected_status' => $po->status,
            ],
            'status' => 'pending',
            'expires_at' => now()->addMinutes(10),
        ]);

        PuffyAuditLog::create([
            'id' => Str::uuid(),
            'user_id' => $user->id,
            'action' => 'puffy_action_drafted',
            'details' => ['action_id' => $action->id, 'action_type' => $action->action_type, 'po_id' => $po->id],
            'ip_address' => $request->ip(),
        ]);

        return $this->sendResponse([
            'id' => $action->id,
            'action_type' => $action->action_type,
            'status' => $action->status,
            'expires_at' => $action->expires_at,
            'summary' => "Aktifkan Customer PO {$po->po_number} untuk {$po->customer?->name}?",
        ], 'Draft aksi Nanu berhasil dibuat.', 201);
    }

    /**
     * Confirm a pending action.
     */
    public function confirmAction(Request $request, string $id)
    {
        $user = $request->user();

        try {
            $result = \\Illuminate\\Support\\Facades\\DB::transaction(function () use ($id, $user, $request) {
                $action = PuffyPendingAction::where('id', $id)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if (!$action) return ['error' => 'Aksi tertunda tidak ditemukan.', 'code' => 404];
                if ($action->status !== 'pending') return ['error' => 'Aksi sudah diproses atau kedaluwarsa.', 'code' => 409];
                if ($action->expires_at && $action->expires_at->isPast()) {
                    $action->update(['status' => 'expired']);
                    return ['error' => 'Konfirmasi aksi sudah kedaluwarsa. Buat draft baru.', 'code' => 410];
                }
                if ($action->action_type !== 'customer_po.activate') {
                    return ['error' => 'Jenis aksi belum didukung.', 'code' => 422];
                }
                abort_unless($user?->hasPermission('po.activate'), 403, __('auth.unauthorized'));

                $po = \\App\\Models\\CustomerPo::whereKey($action->payload['po_id'] ?? null)
                    ->lockForUpdate()
                    ->first();
                if (!$po) return ['error' => 'Customer PO tidak ditemukan.', 'code' => 404];
                if (($action->payload['expected_status'] ?? null) !== \\App\\Models\\CustomerPo::STATUS_DRAFT
                    || $po->status !== \\App\\Models\\CustomerPo::STATUS_DRAFT) {
                    return ['error' => 'Status Customer PO berubah sejak draft dibuat. Buat draft baru.', 'code' => 409];
                }
                if (!$po->lines()->exists()) return ['error' => 'Customer PO tidak memiliki item.', 'code' => 422];

                $po->update(['status' => \\App\\Models\\CustomerPo::STATUS_OPEN]);
                app(\\App\\Services\\SecurityAuditLogger::class)->log(
                    $user->id,
                    'ACTIVATE_PO',
                    'CUSTOMER_PO',
                    $po->id,
                    ['status' => \\App\\Models\\CustomerPo::STATUS_DRAFT],
                    ['status' => \\App\\Models\\CustomerPo::STATUS_OPEN, 'source' => 'NANU']
                );
                $action->update(['status' => 'executed', 'executed_at' => now()]);
                PuffyAuditLog::create([
                    'id' => Str::uuid(),
                    'user_id' => $user->id,
                    'action' => 'puffy_action_executed',
                    'details' => ['action_id' => $action->id, 'action_type' => $action->action_type, 'po_id' => $po->id],
                    'ip_address' => $request->ip(),
                ]);

                return ['data' => [
                    'action_id' => $action->id,
                    'status' => 'executed',
                    'po_id' => $po->id,
                    'po_number' => $po->po_number,
                    'po_status' => \\App\\Models\\CustomerPo::find($po->id)->status,
                ]];
            });

            if (isset($result['error'])) return $this->sendError($result['error'], [], $result['code']);
            return $this->sendResponse($result['data'], 'Customer PO berhasil diaktifkan melalui Nanu.');
        } catch (\\Symfony\\Component\\HttpKernel\\Exception\\HttpExceptionInterface $e) {
            throw $e;
        } catch (\\Throwable $e) {
            \\Illuminate\\Support\\Facades\\Log::error('Nanu action execution failed', [
                'action_id' => $id,
                'exception' => $e->getMessage(),
            ]);
            return $this->sendError('Aksi gagal dijalankan. Tidak ada konfirmasi keberhasilan.', [], 500);
        }
    }

    /**
     * Cancel a pending action.
     */
    public function cancelAction(Request $request, string $id)
    {
        $user = $request->user();
        $action = PuffyPendingAction::where('id', $id)->where('user_id', $user->id)->first();

        if (!$action) {
            return $this->sendError('Aksi tertunda tidak ditemukan.', [], 404);
        }

        if ($action->status !== 'pending') {
            return $this->sendError('Aksi sudah diproses sebelumnya.', [], 400);
        }

        $action->update([
            'status' => 'cancelled',
        ]);

        PuffyAuditLog::create([
            'id' => Str::uuid(),
            'user_id' => $user->id,
            'action' => 'puffy_action_cancelled',
            'details' => ['action_type' => $action->action_type],
            'ip_address' => $request->ip(),
        ]);

        return $this->sendResponse($action, 'Aksi dibatalkan.');
    }

    /**
     * Get quick questions for UI recommendations.
     */
    public function quickQuestions()
    {
        return $this->sendResponse($this->knowledgeService->getQuickQuestions(), 'Daftar pertanyaan cepat berhasil dimuat.');
    }

    /**
     * Get knowledge templates metadata.
     */
    public function knowledgeTemplates(Request $request)
    {
        $category = $request->input('category');
        $templates = $this->knowledgeService->getTemplates($category);
        return $this->sendResponse($templates, 'Knowledge templates berhasil dimuat.');
    }
}
