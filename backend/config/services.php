<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'puffy' => [
        'provider' => env('PUFFY_AI_PROVIDER', 'ollama'),
        'ollama_url' => env('PUFFY_OLLAMA_URL', 'http://127.0.0.1:11434'),
        'ollama_model' => env('PUFFY_OLLAMA_MODEL', 'llama3'),
        'openai_base_url' => env('PUFFY_OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'openai_api_key' => env('PUFFY_OPENAI_API_KEY'),
        'openai_model' => env('PUFFY_OPENAI_MODEL', 'gpt-4o-mini'),
        'timeout' => (int) env('PUFFY_AI_TIMEOUT', 30),
    ],

];
