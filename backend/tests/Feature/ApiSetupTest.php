<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_request_returns_json_401(): void
    {
        $this->getJson('/api/v1/user')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_unauthenticated_request_without_json_accept_header_returns_json_401(): void
    {
        $this->get('/api/v1/user')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_authenticated_user_can_fetch_their_profile(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonMissingPath('data.password');
    }

    public function test_cors_allows_configured_frontend_origin(): void
    {
        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'GET',
        ])->options('/api/v1/user')
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    public function test_cors_does_not_allow_unknown_origin(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://evil.example',
            'Access-Control-Request-Method' => 'GET',
        ])->options('/api/v1/user');

        $this->assertNotSame('http://evil.example', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $response->headers->get('Access-Control-Allow-Origin'));
    }
}
