from rest_framework import permissions

from .models import UserRole


class IsAdmin(permissions.BasePermission):
    message = "Yalnız admin."

    def has_permission(self, request, view) -> bool:
        u = request.user
        return bool(u.is_authenticated and getattr(u, "role", None) == UserRole.ADMIN)
