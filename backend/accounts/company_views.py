from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from jobs.models import JobPosting
from jobs.permissions import IsCompanyRecruiterOrAdmin
from jobs.serializers import JobPostingPublicSerializer

from .models import EmployerProfile
from .serializers import EmployerProfileMineSerializer


def employer_public_display_name(user) -> str:
    j = (
        JobPosting.objects.filter(employer=user, is_active=True)
        .order_by("-created_at")
        .first()
    )
    if j is not None:
        return j.display_company()
    return user.email


class CompanyPublicDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug: str):
        profile = get_object_or_404(
            EmployerProfile.objects.select_related("user"),
            slug=slug,
        )
        user = profile.user
        jobs = (
            JobPosting.objects.filter(employer=user, is_active=True)
            .select_related("employer", "employer__employer_profile")
            .order_by("-created_at")
        )
        job_data = JobPostingPublicSerializer(
            jobs,
            many=True,
            context={"request": request},
        ).data
        logo_url = None
        if profile.logo:
            url = profile.logo.url
            logo_url = request.build_absolute_uri(url)

        return Response(
            {
                "slug": profile.slug,
                "display_name": employer_public_display_name(user),
                "tagline": profile.tagline or "",
                "about": profile.about,
                "website": profile.website or "",
                "logo_url": logo_url,
                "jobs": job_data,
            },
        )


class EmployerProfileMineView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCompanyRecruiterOrAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        profile, _ = EmployerProfile.objects.get_or_create(user=request.user)
        return Response(
            EmployerProfileMineSerializer(
                profile,
                context={"request": request},
            ).data,
        )

    def patch(self, request):
        profile, _ = EmployerProfile.objects.get_or_create(user=request.user)
        ser = EmployerProfileMineSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        profile.refresh_from_db()
        return Response(
            EmployerProfileMineSerializer(
                profile,
                context={"request": request},
            ).data,
        )
