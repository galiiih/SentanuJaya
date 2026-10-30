<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\PuffyConversation;
use App\Models\PuffyMessage;
use App\Models\PuffyFeedback;
use App\Models\PuffyPendingAction;
use App\Models\PuffyAuditLog;
use App\Services\PuffyAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PuffyController extends BaseApiController
{
    protected PuffyAiService $aiService;

    public function __construct(PuffyAiService $aiService)
    {
        $this->aiService = $aiService;
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

            // 1. Status event
            $sendEvent('status', [
                'label' => 'Menyiapkan analisis ERP Sentanu Jaya…',
                'ui' => [
                    'route' => $pageContext['route'] ?? '/dashboard',
                    'target' => null,
                ]
            ]);
            usleep(300000);

            // Detect tool if applicable
            $toolName = $this->aiService->detectTool($messageText);
            $toolResultData = null;

            if ($toolName) {
                $sendEvent('status', [
                    'label' => 'Mengambil data operasional dari database…',
                    'ui' => [
                        'route' => $pageContext['route'] ?? '/dashboard',
                        'target' => 'table',
                    ]
                ]);
                usleep(400000);
                $toolResultData = $this->aiService->executeTool($toolName);
                
                $sendEvent('tool_result', $toolResultData);
            }

            // Stream response tokens
            $replyText = $toolResultData['summary'] ?? "Halo {$user->name}, saya Puffy asisten operasional Sentanu Jaya. Berdasarkan query Anda, sistem mencatat data terkini dari database ERP.";
            
            $words = explode(' ', $replyText);
            $chunk = '';
            foreach ($words as $index => $word) {
                $chunk .= ($index === 0 ? '' : ' ') . $word;
                if ($index % 3 === 2 || $index === count($words) - 1) {
                    $sendEvent('token', ['text' => $chunk]);
                    $chunk = '';
                    usleep(50000);
                }
            }

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
     * Confirm a pending action.
     */
    public function confirmAction(Request $request, string $id)
    {
        $user = $request->user();
        $action = PuffyPendingAction::where('id', $id)->where('user_id', $user->id)->first();

        if (!$action) {
            return $this->sendError('Aksi tertunda tidak ditemukan.', [], 404);
        }

        if ($action->status !== 'pending') {
            return $this->sendError('Aksi sudah diproses atau kedaluwarsa.', [], 400);
        }

        $action->update([
            'status' => 'confirmed',
            'executed_at' => now(),
        ]);

        PuffyAuditLog::create([
            'id' => Str::uuid(),
            'user_id' => $user->id,
            'action' => 'puffy_action_confirmed',
            'details' => ['action_type' => $action->action_type, 'payload' => $action->payload],
            'ip_address' => $request->ip(),
        ]);

        return $this->sendResponse($action, 'Aksi berhasil dikonfirmasi dan dieksekusi.');
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
}
