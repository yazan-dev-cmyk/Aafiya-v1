<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_liveness_probe_returns_success(): void
    {
        $response = $this->getJson('/up');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'up',
            ])
            ->assertJsonStructure([
                'status',
                'timestamp',
            ]);
    }

    public function test_readiness_probe_returns_healthy_system_status(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'healthy',
                'version' => '1.0.0',
            ])
            ->assertJsonStructure([
                'status',
                'timestamp',
                'platform',
                'version',
                'checks' => [
                    'database' => [
                        'status',
                        'latency_ms',
                    ],
                    'cache' => [
                        'status',
                    ],
                    'queue' => [
                        'connection',
                        'status',
                    ],
                ],
            ]);
    }

    public function test_health_check_does_not_leak_sensitive_credentials(): void
    {
        $response = $this->getJson('/api/v1/health');

        $content = $response->getContent();

        // Ensure database credentials, hostnames or passwords are never leaked
        $this->assertStringNotContainsString('password', strtolower($content));
        $this->assertStringNotContainsString('yazan', strtolower($content));
        $this->assertStringNotContainsString('127.0.0.1', $content);
    }
}
