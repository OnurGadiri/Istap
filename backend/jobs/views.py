from django.db.models import Case, IntegerField, Q, QuerySet, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserRole

from .models import (
    ApplicationStatus,
    EmploymentType,
    JobApplication,
    JobPosting,
    JobPostingViewLog,
    SavedJob,
    WorkMode,
)
from .permissions import (
    CanManageJobApplications,
    IsCompanyRecruiterOrAdmin,
    IsEmployerOfJobApplication,
    IsEmployerOrReadOnly,
    IsJobSeeker,
)
from .serializers import (
    JobApplicationCreateSerializer,
    JobApplicationEmployerSerializer,
    JobApplicationMineSerializer,
    JobApplicationStatusSerializer,
    JobPostingPublicSerializer,
    JobPostingSerializer,
)


class JobPostingListPagination(PageNumberPagination):
    page_size = 10
    page_query_param = "page"
    max_page_size = 50
    page_size_query_param = "page_size"


class JobPostingListView(generics.ListAPIView):
    serializer_class = JobPostingPublicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = JobPostingListPagination

    def get_queryset(self) -> QuerySet[JobPosting]:
        qs = _job_public_queryset()
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
        location = (self.request.query_params.get("location") or "").strip()
        if location:
            qs = qs.filter(location__icontains=location)
        work_mode = (self.request.query_params.get("work_mode") or "").strip().lower()
        if work_mode in WorkMode.values:
            qs = qs.filter(work_mode=work_mode)
        emp = (self.request.query_params.get("employment_type") or "").strip().lower()
        if emp in EmploymentType.values:
            qs = qs.filter(employment_type=emp)
        ordering = (self.request.query_params.get("ordering") or "-created_at").strip()
        allowed = frozenset({"created_at", "-created_at", "title", "-title"})
        if ordering not in allowed:
            ordering = "-created_at"
        now = timezone.now()
        qs = qs.annotate(
            _employer_boost=Case(
                When(
                    employer__premium_employer_until__isnull=False,
                    employer__premium_employer_until__gt=now,
                    then=Value(1),
                ),
                default=Value(0),
                output_field=IntegerField(),
            ),
        )
        boost_first = "-_employer_boost"
        if ordering == "-created_at":
            return qs.order_by(boost_first, "-created_at")
        if ordering == "created_at":
            return qs.order_by(boost_first, "created_at")
        if ordering == "title":
            return qs.order_by(boost_first, "title")
        return qs.order_by(boost_first, "-title")


def _job_public_queryset() -> QuerySet[JobPosting]:
    return JobPosting.objects.filter(is_active=True).select_related(
        "employer",
        "employer__employer_profile",
    )


class JobPostingDetailView(generics.RetrieveAPIView):
    serializer_class = JobPostingPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self) -> QuerySet[JobPosting]:
        return _job_public_queryset()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        viewer = request.user if request.user.is_authenticated else None
        JobPostingViewLog.objects.create(job=instance, viewer=viewer)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class EmployerSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCompanyRecruiterOrAdmin]

    def get(self, request):
        u = request.user
        jobs = JobPosting.objects.filter(employer=u)
        apps = JobApplication.objects.filter(job__employer=u)
        return Response(
            {
                "my_jobs_total": jobs.count(),
                "active_jobs": jobs.filter(is_active=True).count(),
                "applications_total": apps.count(),
                "pending_applications": apps.filter(
                    status=ApplicationStatus.PENDING,
                ).count(),
            },
        )


class EmployerInsightsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCompanyRecruiterOrAdmin]

    def get(self, request):
        if not request.user.is_premium_employer:
            return Response(
                {"detail": "Bu panel yalnız şirkət Premium üzvləri üçündür."},
                status=status.HTTP_403_FORBIDDEN,
            )
        from datetime import timedelta

        since = timezone.now() - timedelta(days=7)
        jobs_qs = JobPosting.objects.filter(employer=request.user)
        rows = []
        for job in jobs_qs:
            rows.append(
                {
                    "job_id": job.id,
                    "title": job.title,
                    "is_active": job.is_active,
                    "views_total": JobPostingViewLog.objects.filter(job=job).count(),
                    "views_last_7_days": JobPostingViewLog.objects.filter(
                        job=job,
                        created_at__gte=since,
                    ).count(),
                    "applications": JobApplication.objects.filter(job=job).count(),
                },
            )
        return Response({"jobs": rows})


class SavedJobListView(generics.ListAPIView):
    serializer_class = JobPostingPublicSerializer
    permission_classes = [permissions.IsAuthenticated, IsJobSeeker]
    pagination_class = None

    def get_queryset(self) -> QuerySet[JobPosting]:
        u = self.request.user
        ids = list(
            SavedJob.objects.filter(user=u)
            .order_by("-created_at")
            .values_list("job_id", flat=True),
        )
        if not ids:
            return JobPosting.objects.none()
        ordering = Case(
            *[When(pk=pk, then=pos) for pos, pk in enumerate(ids)],
            output_field=IntegerField(),
        )
        return (
            JobPosting.objects.filter(pk__in=ids, is_active=True)
            .select_related("employer", "employer__employer_profile")
            .annotate(_save_order=ordering)
            .order_by("_save_order")
        )


class JobBookmarkView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsJobSeeker]

    def post(self, request, job_id):
        job = get_object_or_404(JobPosting, pk=job_id, is_active=True)
        SavedJob.objects.get_or_create(user=request.user, job=job)
        return Response({"saved": True}, status=status.HTTP_201_CREATED)

    def delete(self, request, job_id):
        SavedJob.objects.filter(user=request.user, job_id=job_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JobSimilarListView(generics.ListAPIView):
    serializer_class = JobPostingPublicSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self) -> QuerySet[JobPosting]:
        job = get_object_or_404(JobPosting, pk=self.kwargs["job_id"], is_active=True)
        return (
            JobPosting.objects.filter(is_active=True)
            .exclude(pk=job.pk)
            .filter(work_mode=job.work_mode)
            .select_related("employer", "employer__employer_profile")
            .order_by("-created_at")[:12]
        )


class JobPostingCreateView(generics.CreateAPIView):
    serializer_class = JobPostingSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyRecruiterOrAdmin]

    def perform_create(self, serializer) -> None:
        serializer.save(employer=self.request.user)


class MyJobPostingListView(generics.ListAPIView):
    serializer_class = JobPostingSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyRecruiterOrAdmin]

    def get_queryset(self) -> QuerySet[JobPosting]:
        return JobPosting.objects.filter(employer=self.request.user).select_related(
            "employer",
        )


class JobPostingManageView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JobPostingSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsCompanyRecruiterOrAdmin,
        IsEmployerOrReadOnly,
    ]

    def get_queryset(self) -> QuerySet[JobPosting]:
        return JobPosting.objects.filter(employer=self.request.user)


class JobApplyView(generics.CreateAPIView):
    serializer_class = JobApplicationCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsJobSeeker]

    def create(self, request, *args, **kwargs):
        job = get_object_or_404(JobPosting, pk=kwargs["job_id"], is_active=True)
        if JobApplication.objects.filter(job=job, applicant=request.user).exists():
            return Response(
                {"detail": "Bu elana artıq müraciət etmisiniz."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        app = JobApplication.objects.create(
            job=job,
            applicant=request.user,
            cover_letter=serializer.validated_data.get("cover_letter", ""),
            resume=serializer.validated_data.get("resume"),
        )
        return Response(
            JobApplicationMineSerializer(app, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyJobApplicationListView(generics.ListAPIView):
    serializer_class = JobApplicationMineSerializer
    permission_classes = [permissions.IsAuthenticated, IsJobSeeker]

    def get_queryset(self) -> QuerySet[JobApplication]:
        return JobApplication.objects.filter(applicant=self.request.user).select_related(
            "job",
        )


class JobPostingApplicationsListView(generics.ListAPIView):
    serializer_class = JobApplicationEmployerSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsCompanyRecruiterOrAdmin,
        CanManageJobApplications,
    ]

    def get_queryset(self) -> QuerySet[JobApplication]:
        job_id = self.kwargs["job_id"]
        return JobApplication.objects.filter(job_id=job_id).select_related(
            "applicant",
            "applicant__job_seeker_profile",
            "job",
        )


class JobApplicationStatusUpdateView(generics.UpdateAPIView):
    serializer_class = JobApplicationStatusSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsCompanyRecruiterOrAdmin,
        IsEmployerOfJobApplication,
    ]
    http_method_names = ["patch", "head", "options"]

    def get_queryset(self) -> QuerySet[JobApplication]:
        u = self.request.user
        qs = JobApplication.objects.select_related("job", "applicant")
        if u.role == UserRole.ADMIN:
            return qs
        return qs.filter(job__employer=u)
