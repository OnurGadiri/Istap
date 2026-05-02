from __future__ import annotations

from rest_framework import serializers

from .models import JobSeekerProfile

RESERVED_JOB_SEEKER_SLUGS = frozenset(
    {
        "mine",
        "jobs",
        "companies",
        "u",
        "in",
        "login",
        "register",
        "dashboard",
        "api",
        "admin",
        "profile",
        "public",
        "job-seeker",
        "_next",
    },
)


def normalize_public_slug(value: str | None) -> str | None:
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    return value.strip().lower()


def validate_job_seeker_public_slug(
    value: str | None,
    *,
    instance: JobSeekerProfile | None = None,
) -> str | None:
    v = normalize_public_slug(value)
    if v is None:
        return None
    if v in RESERVED_JOB_SEEKER_SLUGS:
        raise serializers.ValidationError("Bu ünvan rezerv olunub.")
    qs = JobSeekerProfile.objects.filter(public_slug=v)
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
    if qs.exists():
        raise serializers.ValidationError("Bu ünvan artıq götürülüb.")
    return v
