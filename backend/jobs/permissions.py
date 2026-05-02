from rest_framework import permissions

from accounts.models import UserRole


class IsCompanyRecruiterOrAdmin(permissions.BasePermission):
    message = "Yalnız şirkət, recruiter və ya admin elan yaza bilər."

    def has_permission(self, request, view) -> bool:
        u = request.user
        if not u.is_authenticated:
            return False
        return u.role in (
            UserRole.COMPANY,
            UserRole.RECRUITER,
            UserRole.ADMIN,
        )


class IsEmployerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.employer_id == request.user.id


class IsJobSeeker(permissions.BasePermission):
    message = "Yalnız namizəd müraciət edə bilər."

    def has_permission(self, request, view) -> bool:
        u = request.user
        return bool(u.is_authenticated and u.role == UserRole.JOB_SEEKER)


class CanManageJobApplications(permissions.BasePermission):
    message = "Bu elanın müraciətlərinə baxmaq üçün icazə yoxdur."

    def has_permission(self, request, view) -> bool:
        from django.shortcuts import get_object_or_404

        from .models import JobPosting

        u = request.user
        if not u.is_authenticated:
            return False
        job_id = view.kwargs.get("job_id")
        if job_id is None:
            return False
        job = get_object_or_404(JobPosting, pk=job_id)
        if u.role == UserRole.ADMIN:
            return True
        return job.employer_id == u.id


class IsEmployerOfJobApplication(permissions.BasePermission):
    def has_object_permission(self, request, view, obj) -> bool:
        u = request.user
        if u.role == UserRole.ADMIN:
            return True
        return obj.job.employer_id == u.id
