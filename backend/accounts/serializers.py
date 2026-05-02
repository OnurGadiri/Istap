from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import EmployerProfile, UserRole

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    is_premium_seeker = serializers.BooleanField(read_only=True)
    is_premium_employer = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "role",
            "first_name",
            "last_name",
            "is_premium_seeker",
            "is_premium_employer",
            "premium_seeker_until",
            "premium_employer_until",
        )
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "password_confirm", "role", "first_name", "last_name")

    def validate_role(self, value: str) -> str:
        if value == UserRole.ADMIN:
            raise serializers.ValidationError("Admin rolu ilə qeydiyyat icazə verilmir.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Parollar uyğun gəlmir."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class EmployerProfileMineSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField(read_only=True)
    logo_url = serializers.SerializerMethodField(read_only=True)
    logo = serializers.ImageField(write_only=True, allow_null=True, required=False)

    class Meta:
        model = EmployerProfile
        fields = (
            "slug",
            "about",
            "website",
            "tagline",
            "display_name",
            "logo_url",
            "logo",
        )
        read_only_fields = ("display_name", "logo_url")

    def get_logo_url(self, obj: EmployerProfile) -> str | None:
        if not obj.logo:
            return None
        request = self.context.get("request")
        url = obj.logo.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_display_name(self, obj: EmployerProfile) -> str:
        from jobs.models import JobPosting

        j = (
            JobPosting.objects.filter(employer=obj.user, is_active=True)
            .order_by("-created_at")
            .first()
        )
        if j is not None:
            return j.display_company()
        return obj.user.email

    def validate_slug(self, value: str | None) -> str | None:
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        v = value.strip().lower()
        if v == "mine":
            raise serializers.ValidationError("Bu ünvan rezerv olunub.")
        qs = EmployerProfile.objects.filter(slug=v)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Bu ünvan artıq götürülüb.")
        return v
