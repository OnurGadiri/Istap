from django.urls import path

from . import admin_views, views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("session/", views.SessionView.as_view(), name="auth-session"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path(
        "admin/overview/",
        admin_views.AdminOverviewView.as_view(),
        name="auth-admin-overview",
    ),
]
