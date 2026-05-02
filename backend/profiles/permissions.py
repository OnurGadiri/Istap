from rest_framework import permissions

from accounts.models import UserRole


class IsJobSeeker(permissions.BasePermission):
    message = "Yalnız namizəd rolu bu əməliyyata icazə verilir."

    def has_permission(self, request, view) -> bool:
        u = request.user
        return bool(
            u and u.is_authenticated and getattr(u, "role", None) == UserRole.JOB_SEEKER
        )


class IsEmployerViewer(permissions.BasePermission):
    message = "Yalnız şirkət, recruiter və ya admin namizəd siyahısına baxa bilər."

    def has_permission(self, request, view) -> bool:
        u = request.user
        if not u.is_authenticated:
            return False
        return getattr(u, "role", None) in (
            UserRole.COMPANY,
            UserRole.RECRUITER,
            UserRole.ADMIN,
        )
