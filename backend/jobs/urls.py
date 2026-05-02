from django.urls import path

from . import views

urlpatterns = [
    path(
        "employer/summary/",
        views.EmployerSummaryView.as_view(),
        name="job-employer-summary",
    ),
    path(
        "employer/insights/",
        views.EmployerInsightsView.as_view(),
        name="job-employer-insights",
    ),
    path("saved/", views.SavedJobListView.as_view(), name="job-saved-list"),
    path("applications/mine/", views.MyJobApplicationListView.as_view(), name="job-app-mine"),
    path(
        "applications/<int:pk>/",
        views.JobApplicationStatusUpdateView.as_view(),
        name="job-app-status",
    ),
    path("create/", views.JobPostingCreateView.as_view(), name="job-create"),
    path("mine/", views.MyJobPostingListView.as_view(), name="job-mine"),
    path("manage/<int:pk>/", views.JobPostingManageView.as_view(), name="job-manage"),
    path("<int:job_id>/bookmark/", views.JobBookmarkView.as_view(), name="job-bookmark"),
    path("<int:job_id>/similar/", views.JobSimilarListView.as_view(), name="job-similar"),
    path("<int:job_id>/apply/", views.JobApplyView.as_view(), name="job-apply"),
    path(
        "<int:job_id>/applications/",
        views.JobPostingApplicationsListView.as_view(),
        name="job-applications-list",
    ),
    path("<int:pk>/", views.JobPostingDetailView.as_view(), name="job-detail"),
    path("", views.JobPostingListView.as_view(), name="job-list"),
]
