from django.urls import path

from . import company_views

urlpatterns = [
    path(
        "companies/mine/",
        company_views.EmployerProfileMineView.as_view(),
        name="company-profile-mine",
    ),
    path(
        "companies/<slug:slug>/",
        company_views.CompanyPublicDetailView.as_view(),
        name="company-public-detail",
    ),
]
