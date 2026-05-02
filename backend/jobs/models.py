import uuid
from pathlib import Path

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


def application_resume_upload_to(instance, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in (".pdf", ".doc", ".docx"):
        ext = ".pdf"
    return f"applications/resumes/{uuid.uuid4().hex}{ext}"


class WorkMode(models.TextChoices):
    REMOTE = "remote", "Uzaqdan"
    HYBRID = "hybrid", "Hibrid"
    ONSITE = "onsite", "Ofisdə"


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", "Tam ştat"
    PART_TIME = "part_time", "Yarım ştat"
    CONTRACT = "contract", "Müqavilə"
    INTERNSHIP = "internship", "Təcrübə"


class JobPosting(models.Model):
    employer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_postings",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    company_display_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Boşdursa, göstərici üçün employer e-poçtu istifadə oluna bilər.",
    )
    location = models.CharField(max_length=255, blank=True)
    work_mode = models.CharField(
        max_length=20,
        choices=WorkMode.choices,
        default=WorkMode.REMOTE,
    )
    salary_display = models.CharField(max_length=255, blank=True)
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Vakansiya"
        verbose_name_plural = "Vakansiyalar"

    def __str__(self) -> str:
        return self.title

    def display_company(self) -> str:
        if self.company_display_name.strip():
            return self.company_display_name.strip()
        return self.employer.email


class ApplicationStatus(models.TextChoices):
    PENDING = "pending", "Gözləmədə"
    REVIEWED = "reviewed", "Baxılıb"
    REJECTED = "rejected", "Rədd"
    SHORTLISTED = "shortlisted", "Qısa siyahı"


class JobApplication(models.Model):
    job = models.ForeignKey(
        JobPosting,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_applications",
    )
    cover_letter = models.TextField(blank=True)
    resume = models.FileField(
        upload_to=application_resume_upload_to,
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=["pdf", "doc", "docx"]),
        ],
        help_text="CV: PDF, DOC və ya DOCX.",
    )
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Müraciət"
        verbose_name_plural = "Müraciətlər"
        constraints = [
            models.UniqueConstraint(
                fields=["job", "applicant"],
                name="unique_job_applicant",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.applicant.email} → {self.job.title}"


class SavedJob(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_saves",
    )
    job = models.ForeignKey(
        JobPosting,
        on_delete=models.CASCADE,
        related_name="saved_entries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "job"],
                name="unique_user_saved_job",
            ),
        ]


class JobPostingViewLog(models.Model):
    job = models.ForeignKey(
        JobPosting,
        on_delete=models.CASCADE,
        related_name="view_logs",
    )
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="job_posting_views",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["job", "-created_at"]),
        ]
