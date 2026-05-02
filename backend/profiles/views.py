from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from io import BytesIO

from django.conf import settings
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserRole

from .cv_pdf import render_cv_pdf
from .models import JobSeekerProfile, JobSeekerProfileViewLog
from .permissions import IsEmployerViewer, IsJobSeeker
from .serializers import (
    JobSeekerBrowseSerializer,
    JobSeekerProfileSerializer,
    JobSeekerPublicSerializer,
)

logger = logging.getLogger(__name__)


class JobSeekerProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = JobSeekerProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsJobSeeker]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self) -> JobSeekerProfile:
        profile, _ = JobSeekerProfile.objects.get_or_create(user=self.request.user)
        return profile


class JobSeekerPublicProfileView(generics.RetrieveAPIView):
    serializer_class = JobSeekerPublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "public_slug"
    lookup_url_kwarg = "slug"

    def get_queryset(self):
        return (
            JobSeekerProfile.objects.filter(public_slug__isnull=False)
            .exclude(public_slug="")
            .select_related("user")
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        u = request.user
        if u.is_authenticated and getattr(u, "role", None) in (
            UserRole.COMPANY,
            UserRole.RECRUITER,
            UserRole.ADMIN,
        ):
            JobSeekerProfileViewLog.objects.create(profile=instance, viewer=u)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class BrowsePagination(PageNumberPagination):
    page_size = 12
    page_query_param = "page"


class JobSeekerBrowseListView(generics.ListAPIView):
    serializer_class = JobSeekerBrowseSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmployerViewer]
    pagination_class = BrowsePagination

    def get_queryset(self):
        from django.db.models import Case, IntegerField, Value, When

        now = timezone.now()
        return (
            JobSeekerProfile.objects.filter(public_slug__isnull=False)
            .exclude(public_slug="")
            .select_related("user")
            .annotate(
                _premium_rank=Case(
                    When(
                        user__premium_seeker_until__isnull=False,
                        user__premium_seeker_until__gt=now,
                        then=Value(1),
                    ),
                    default=Value(0),
                    output_field=IntegerField(),
                ),
            )
            .order_by("-_premium_rank", "-updated_at")
        )


class JobSeekerInsightsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsJobSeeker]

    def get(self, request):
        if not request.user.is_premium_seeker:
            return Response(
                {"detail": "Bu statistika yalnız Premium namizədlər üçündür."},
                status=status.HTTP_403_FORBIDDEN,
            )
        from django.db.models import Count

        from jobs.models import JobApplication

        profile = get_object_or_404(JobSeekerProfile, user=request.user)
        apps = JobApplication.objects.filter(applicant=request.user)
        status_counts = {
            row["status"]: row["c"]
            for row in apps.values("status").annotate(c=Count("id"))
        }
        recent_views = [
            {
                "at": v.created_at.isoformat(),
                "viewer_email": v.viewer.email if v.viewer else None,
            }
            for v in JobSeekerProfileViewLog.objects.filter(profile=profile).select_related(
                "viewer",
            )[:30]
        ]
        return Response(
            {
                "applications_by_status": status_counts,
                "applications_total": apps.count(),
                "profile_views_recent": recent_views,
            },
        )


class JobSeekerCvPdfView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsJobSeeker]

    def get(self, request):
        if not request.user.is_premium_seeker:
            return Response(
                {"detail": "CV PDF yalnız Premium namizədlər üçündür."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = get_object_or_404(JobSeekerProfile, user=request.user)
        buf = BytesIO()
        render_cv_pdf(profile, buf)
        buf.seek(0)
        resp = FileResponse(buf, content_type="application/pdf")
        raw = (profile.public_slug or "cv").strip() or "cv"
        safe_fn = "".join(c if c.isalnum() or c in "-_" else "_" for c in raw)[:80] or "cv"
        resp["Content-Disposition"] = f'attachment; filename="{safe_fn}.pdf"'
        return resp


def _profile_text_for_ai(profile: JobSeekerProfile) -> str:
    u = profile.user
    parts = [
        f"Ad: {u.first_name} {u.last_name}".strip(),
        f"Bio: {profile.bio}",
        f"Yer: {profile.location}",
        f"Bacarıqlar: {profile.skills}",
        f"Dillər: {profile.languages}",
        f"Təhsil/ölkə: {profile.preferred_countries}",
    ]
    return "\n".join(p for p in parts if p and not p.endswith(": "))


def _mock_cv_analysis() -> dict:
    return {
        "summary": "Profiliniz ümumi strukturla təqdim olunub; bacarıq və təcrübə hissələrini daha konkret rəqəmlərlə zənginləşdirin.",
        "strengths": [
            "Profil sahələri doldurulub",
            "İş rejimi və lokasiya göstərilir",
        ],
        "improvements": [
            "Bio-da nailiyyətləri ölçülə bilən nəticələrlə əlavə edin",
            "Bacarıqları prioritet sırası ilə qısaldın",
        ],
        "score": 68,
        "model": "mock",
    }


def _openai_cv_analysis(text: str) -> dict | None:
    key = (settings.OPENAI_API_KEY or "").strip()
    if not key:
        return None
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": (
                    "Sən karyera məsləhətçisisən. Cavabı Azərbaycan dilində yalnız JSON kimi ver: "
                    '{"summary":"string","strengths":["..."],"improvements":["..."],"score":0-100}'
                ),
            },
            {"role": "user", "content": text[:12000]},
        ],
        "response_format": {"type": "json_object"},
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = json.loads(res.read().decode())
        content = raw["choices"][0]["message"]["content"]
        return json.loads(content)
    except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError) as e:
        logger.warning("OpenAI CV analizi alınmadı: %s", e)
        return None


class JobSeekerCvAnalyzeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsJobSeeker]

    def post(self, request):
        if not request.user.is_premium_seeker:
            return Response(
                {"detail": "AI CV analizi yalnız Premium namizədlər üçündür."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = get_object_or_404(JobSeekerProfile, user=request.user)
        text = _profile_text_for_ai(profile)
        result = _openai_cv_analysis(text)
        if result is None:
            result = _mock_cv_analysis()
        else:
            result["model"] = "openai"
        return Response(result)
