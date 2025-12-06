<?php

namespace App\Http\Controllers\RegistrarControllers;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $notifications = $user ? $this->query($user->id) : collect();
        $component = $this->resolveComponentForRole(optional($user)->role);

        return Inertia::render($component, [
            'notifications' => $notifications,
        ]);
    }

    public function feed(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['data' => []], 200);
        }

        $notifications = $this->query($user->id);

        return response()->json([
            'data' => $notifications,
        ]);
    }

    protected function query(int $userId)
    {
        $now = now();

        $activeSchoolYear = Schema::hasTable('school_years')
            ? DB::table('school_years')
                ->where('start_date', '<=', $now)
                ->where('end_date', '>=', $now)
                ->orderByDesc('start_date')
                ->first()
            : null;

        $activeSemester = Schema::hasTable('semesters')
            ? DB::table('semesters')
                ->where('is_active', 1)
                ->orderByDesc('updated_at')
                ->first()
            : null;

        $query = Notification::query()
            ->forUser($userId)
            ->latest();

        if ($activeSchoolYear) {
            $query->whereBetween('created_at', [
                $activeSchoolYear->start_date,
                Carbon::parse($activeSchoolYear->end_date)->endOfDay(),
            ]);
        }

        if ($activeSemester) {
            $query->where('created_at', '>=', Carbon::parse($activeSemester->created_at ?? $activeSemester->updated_at ?? $activeSemester->start_date ?? $now)->startOfDay());
        }

        return $query
            ->limit(25)
            ->get([
                'id',
                'title',
                'message',
                'type',
                'url',
                'is_read',
                'created_at',
            ]);
    }

    protected function resolveComponentForRole(?string $role): string
    {
        return match ($role) {
            'program_head' => 'ProgramHead/Notifications/Index',
            default => 'Registrar/Notifications/Index',
        };
    }

    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        $user = $request->user();

        if (!$user || $notification->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (!$notification->is_read) {
            $notification->forceFill(['is_read' => true])->save();
        }

        return response()->json([
            'status' => 'ok',
            'notification_id' => $notification->id,
        ]);
    }
}
