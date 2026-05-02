from django.urls import path

from . import views

urlpatterns = [
    path(
        "public/<slug:slug>/",
        views.JobSeekerPublicProfileView.as_view(),
        name="job-seeker-public-profile",
    ),
    path("profile/", views.JobSeekerProfileDetailView.as_view(), name="job-seeker-profile"),
    path("browse/", views.JobSeekerBrowseListView.as_view(), name="job-seeker-browse"),
    path("insights/", views.JobSeekerInsightsView.as_view(), name="job-seeker-insights"),
    path("cv/pdf/", views.JobSeekerCvPdfView.as_view(), name="job-seeker-cv-pdf"),
    path("cv/analyze/", views.JobSeekerCvAnalyzeView.as_view(), name="job-seeker-cv-analyze"),
]
