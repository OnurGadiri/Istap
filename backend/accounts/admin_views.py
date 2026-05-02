from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from jobs.models import JobApplication, JobPosting

from .permissions import IsAdmin
from .serializers import UserSerializer

User = get_user_model()


class AdminOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        by_role_qs = User.objects.values("role").annotate(c=Count("id"))
        by_role = {row["role"]: row["c"] for row in by_role_qs}
        recent = User.objects.all().order_by("-id")[:50]
        return Response(
            {
                "stats": {
                    "users_total": User.objects.count(),
                    "by_role": by_role,
                    "jobs_total": JobPosting.objects.count(),
                    "jobs_active": JobPosting.objects.filter(is_active=True).count(),
                    "applications_total": JobApplication.objects.count(),
                },
                "recent_users": UserSerializer(recent, many=True).data,
            },
        )
