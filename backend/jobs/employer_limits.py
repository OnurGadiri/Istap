from django.conf import settings

from accounts.models import User, UserRole


def active_job_limit_for(user: User) -> int:
    if user.role == UserRole.ADMIN:
        return settings.ACTIVE_JOB_LIMIT_PREMIUM
    if user.role not in (UserRole.COMPANY, UserRole.RECRUITER):
        return 0
    if user.is_premium_employer:
        return settings.ACTIVE_JOB_LIMIT_PREMIUM
    return settings.ACTIVE_JOB_LIMIT_FREE
