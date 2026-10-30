<?php

namespace App\Services;

class PuffyStreamParser
{
    protected string $buffer = '';

    /**
     * Feed raw chunk from Ollama NDJSON stream and extract complete JSON objects/lines.
     * 
     * @return array<array> Parsed JSON associative arrays
     */
    public function feedOllamaChunk(string $chunk): array
    {
        $this->buffer .= $chunk;
        $results = [];

        while (($pos = strpos($this->buffer, "\n")) !== false) {
            $line = trim(substr($this->buffer, 0, $pos));
            $this->buffer = substr($this->buffer, $pos + 1);

            if ($line === '') {
                continue;
            }

            $decoded = json_decode($line, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $results[] = $decoded;
            }
        }

        return $results;
    }

    /**
     * Flush remaining buffer at end of Ollama stream.
     */
    public function flushOllama(): array
    {
        $results = [];
        $line = trim($this->buffer);
        $this->buffer = '';

        if ($line !== '') {
            $decoded = json_decode($line, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $results[] = $decoded;
            }
        }

        return $results;
    }

    /**
     * Feed raw chunk from OpenAI/9router SSE stream and extract data payloads.
     * 
     * @return array<string|array> Parsed data strings or '[DONE]'
     */
    public function feedOpenAiChunk(string $chunk): array
    {
        $this->buffer .= $chunk;
        $results = [];

        while (($pos = strpos($this->buffer, "\n")) !== false) {
            $line = trim(substr($this->buffer, 0, $pos));
            $this->buffer = substr($this->buffer, $pos + 1);

            if ($line === '' || str_starts_with($line, ':')) {
                continue; // Empty line or SSE comment
            }

            if (str_starts_with($line, 'data: ')) {
                $dataStr = trim(substr($line, 6));
                if ($dataStr === '[DONE]') {
                    $results[] = '[DONE]';
                    continue;
                }
                $decoded = json_decode($dataStr, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $results[] = $decoded;
                }
            }
        }

        return $results;
    }
}
