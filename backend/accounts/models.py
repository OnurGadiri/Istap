from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    JOB_SEEKER = "job_seeker", "Namizəd"
    RECRUITER = "recruiter", "Recruiter"
    COMPANY = "company", "Şirkət"
    ADMIN = "admin", "Admin"


class User(AbstractUser):
    username = None
    email = models.EmailField("e-poçt", unique=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.JOB_SEEKER,
    )
    stripe_customer_id = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
    )
    premium_seeker_until = models.DateTimeField(null=True, blank=True)
    premium_employer_until = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = "İstifadəçi"
        verbose_name_plural = "İstifadəçilər"

    def __str__(self) -> str:
        return self.email

    @property
    def is_premium_seeker(self) -> bool:
        t = self.premium_seeker_until
        return bool(t and t > timezone.now())

    @property
    def is_premium_employer(self) -> bool:
        t = self.premium_employer_until
        return bool(t and t > timezone.now())


class EmployerProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="employer_profile",
    )
    slug = models.SlugField(
        max_length=80,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
    )
    about = models.TextField(blank=True)
    website = models.URLField(blank=True)
    tagline = models.CharField(
        max_length=160,
        blank=True,
        help_text="İctimai səhifədə başlıq altında bir sətir.",
    )
    logo = models.ImageField(
        upload_to="company_logos/%Y/%m/",
        blank=True,
        null=True,
    )

    class Meta:
        verbose_name = "İşəgötürən profili"
        verbose_name_plural = "İşəgötürən profilləri"

    def __str__(self) -> str:
        return f"{self.user.email} ({self.slug or '—'})"
