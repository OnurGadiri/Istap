from rest_framework import serializers

from accounts.models import EmployerProfile, UserRole

from .employer_limits import active_job_limit_for
from profiles.models import JobSeekerProfile

from .models import (
    ApplicationStatus,
    EmploymentType,
    JobApplication,
    JobPosting,
    SavedJob,
    WorkMode,
)


class JobPostingSerializer(serializers.ModelSerializer):
    employer_email = serializers.EmailField(source="employer.email", read_only=True)
    company_label = serializers.CharField(source="display_company", read_only=True)

    class Meta:
        model = JobPosting
        fields = (
            "id",
            "employer",
            "employer_email",
            "company_label",
            "title",
            "description",
            "company_display_name",
            "location",
            "work_mode",
            "employment_type",
            "salary_display",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "employer", "created_at", "updated_at")

    def validate_work_mode(self, value: str) -> str:
        if value not in {c.value for c in WorkMode}:
            raise serializers.ValidationError("Yanlış iş rejimi.")
        return value

    def validate_employment_type(self, value: str) -> str:
        if value not in {c.value for c in EmploymentType}:
            raise serializers.ValidationError("Yanlış məşğulluq növü.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return attrs
        employer = request.user
        limit = active_job_limit_for(employer)
        will_active = attrs.get("is_active", getattr(self.instance, "is_active", True))

        if self.instance is None:
            if will_active:
                current = JobPosting.objects.filter(
                    employer=employer,
                    is_active=True,
                ).count()
                if current >= limit:
                    raise serializers.ValidationError(
                        {
                            "is_active": (
                                f"Aktiv elan limiti ({limit}) dolub. Premium ilə daha çox aktiv "
                                "elan aça bilərsiniz və ya köhnə elanı deaktiv edin."
                            ),
                        },
                    )
            return attrs

        was_active = self.instance.is_active
        will_active = attrs.get("is_active", was_active)
        if will_active and not was_active:
            current = JobPosting.objects.filter(
                employer=employer,
                is_active=True,
            ).exclude(pk=self.instance.pk).count()
            if current >= limit:
                raise serializers.ValidationError(
                    {
                        "is_active": (
                            f"Aktiv elan limiti ({limit}) dolub. Premium ilə daha çox aktiv "
                            "elan aça bilərsiniz və ya köhnə elanı deaktiv edin."
                        ),
                    },
                )
        return attrs


class JobPostingPublicSerializer(serializers.ModelSerializer):
    company_label = serializers.CharField(source="display_company", read_only=True)
    is_saved = serializers.SerializerMethodField()
    employer_slug = serializers.SerializerMethodField()
    employer_premium = serializers.SerializerMethodField()

    class Meta:
        model = JobPosting
        fields = (
            "id",
            "company_label",
            "employer_slug",
            "title",
            "description",
            "location",
            "work_mode",
            "employment_type",
            "salary_display",
            "created_at",
            "is_saved",
            "employer_premium",
        )

    def get_employer_slug(self, obj: JobPosting) -> str | None:
        try:
            slug = obj.employer.employer_profile.slug
        except EmployerProfile.DoesNotExist:
            return None
        return slug or None

    def get_is_saved(self, obj: JobPosting) -> bool:
        request = self.context.get("request")
        u = getattr(request, "user", None)
        if not u or not u.is_authenticated or getattr(u, "role", None) != UserRole.JOB_SEEKER:
            return False
        return SavedJob.objects.filter(user=u, job=obj).exists()

    def get_employer_premium(self, obj: JobPosting) -> bool:
        return bool(getattr(obj.employer, "is_premium_employer", False))


_MAX_RESUME_BYTES = 5 * 1024 * 1024


class JobApplicationCreateSerializer(serializers.ModelSerializer):
    resume = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = JobApplication
        fields = ("cover_letter", "resume")

    def validate_resume(self, value):
        if value and value.size > _MAX_RESUME_BYTES:
            raise serializers.ValidationError("Fayl ölçüsü 5 MB-dan çox ola bilməz.")
        return value


def _absolute_media_url(request, relative: str) -> str:
    if request:
        return request.build_absolute_uri(relative)
    return relative


class JobApplicationMineSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    company_label = serializers.CharField(source="job.display_company", read_only=True)
    resume_url = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = (
            "id",
            "job",
            "job_title",
            "company_label",
            "status",
            "cover_letter",
            "resume_url",
            "created_at",
        )
        read_only_fields = ("id", "job", "status", "created_at")

    def get_resume_url(self, obj: JobApplication) -> str | None:
        if not obj.resume:
            return None
        request = self.context.get("request")
        return _absolute_media_url(request, obj.resume.url)


class JobApplicationEmployerSerializer(serializers.ModelSerializer):
    applicant_email = serializers.EmailField(source="applicant.email", read_only=True)
    applicant_first_name = serializers.CharField(source="applicant.first_name", read_only=True)
    applicant_last_name = serializers.CharField(source="applicant.last_name", read_only=True)
    applicant_public_slug = serializers.SerializerMethodField()
    applicant_avatar_url = serializers.SerializerMethodField()
    resume_url = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = (
            "id",
            "applicant",
            "applicant_email",
            "applicant_first_name",
            "applicant_last_name",
            "applicant_public_slug",
            "applicant_avatar_url",
            "status",
            "cover_letter",
            "resume_url",
            "created_at",
        )
        read_only_fields = ("id", "applicant", "cover_letter", "created_at")

    def get_applicant_public_slug(self, obj: JobApplication) -> str | None:
        try:
            slug = obj.applicant.job_seeker_profile.public_slug
        except JobSeekerProfile.DoesNotExist:
            return None
        return slug or None

    def get_applicant_avatar_url(self, obj: JobApplication) -> str | None:
        try:
            prof = obj.applicant.job_seeker_profile
        except JobSeekerProfile.DoesNotExist:
            return None
        if not prof.avatar:
            return None
        request = self.context.get("request")
        return _absolute_media_url(request, prof.avatar.url)

    def get_resume_url(self, obj: JobApplication) -> str | None:
        if not obj.resume:
            return None
        request = self.context.get("request")
        return _absolute_media_url(request, obj.resume.url)


class JobApplicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = ("status",)

    def validate_status(self, value: str) -> str:
        allowed = {c.value for c in ApplicationStatus}
        if value not in allowed:
            raise serializers.ValidationError("Yanlış status.")
        return value
