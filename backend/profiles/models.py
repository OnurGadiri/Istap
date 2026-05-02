from django.conf import settings
from django.db import models


class WorkMode(models.TextChoices):
    REMOTE = "remote", "Uzaqdan"
    HYBRID = "hybrid", "Hibrid"
    ONSITE = "onsite", "Ofisdə"


class JobSeekerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_seeker_profile",
    )
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    work_mode = models.CharField(
        max_length=20,
        choices=WorkMode.choices,
        default=WorkMode.REMOTE,
    )
    salary_expectation = models.CharField(max_length=255, blank=True)
    preferred_countries = models.TextField(blank=True)
    languages = models.TextField(blank=True)
    skills = models.TextField(blank=True)
    avatar = models.ImageField(
        upload_to="avatars/%Y/%m/",
        blank=True,
        null=True,
    )
    linkedin_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    public_slug = models.SlugField(
        max_length=80,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Namizəd profili"
        verbose_name_plural = "Namizəd profilləri"

    def __str__(self) -> str:
        return f"Profil: {self.user.email}"


class JobSeekerProfileViewLog(models.Model):
    profile = models.ForeignKey(
        JobSeekerProfile,
        on_delete=models.CASCADE,
        related_name="view_logs",
    )
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="job_seeker_profile_views",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["profile", "-created_at"]),
        ]
