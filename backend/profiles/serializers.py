from rest_framework import serializers

from .models import JobSeekerProfile, WorkMode
from .public_slug import validate_job_seeker_public_slug


class JobSeekerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    avatar = serializers.ImageField(allow_null=True, required=False)
    public_slug = serializers.SlugField(allow_null=True, required=False, allow_blank=True)
    linkedin_url = serializers.URLField(allow_blank=True, required=False)
    github_url = serializers.URLField(allow_blank=True, required=False)
    portfolio_url = serializers.URLField(allow_blank=True, required=False)

    class Meta:
        model = JobSeekerProfile
        fields = (
            "email",
            "avatar",
            "public_slug",
            "bio",
            "location",
            "work_mode",
            "salary_expectation",
            "preferred_countries",
            "languages",
            "skills",
            "linkedin_url",
            "github_url",
            "portfolio_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("email", "created_at", "updated_at")

    def validate_public_slug(self, value: str | None) -> str | None:
        return validate_job_seeker_public_slug(value, instance=self.instance)

    def validate_work_mode(self, value: str) -> str:
        allowed = {c.value for c in WorkMode}
        if value not in allowed:
            raise serializers.ValidationError("Yanlış iş rejimi.")
        return value


class JobSeekerPublicSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = JobSeekerProfile
        fields = (
            "public_slug",
            "first_name",
            "last_name",
            "bio",
            "location",
            "work_mode",
            "skills",
            "languages",
            "preferred_countries",
            "salary_expectation",
            "linkedin_url",
            "github_url",
            "portfolio_url",
            "avatar_url",
        )

    def get_avatar_url(self, obj: JobSeekerProfile) -> str | None:
        if not obj.avatar:
            return None
        request = self.context.get("request")
        url = obj.avatar.url
        if request:
            return request.build_absolute_uri(url)
        return url


class JobSeekerBrowseSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    is_premium = serializers.SerializerMethodField()

    class Meta:
        model = JobSeekerProfile
        fields = (
            "public_slug",
            "first_name",
            "last_name",
            "bio",
            "location",
            "work_mode",
            "skills",
            "updated_at",
            "is_premium",
        )

    def get_is_premium(self, obj: JobSeekerProfile) -> bool:
        return bool(getattr(obj.user, "is_premium_seeker", False))

