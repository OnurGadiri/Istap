from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="api-health"),
    path("info/", views.InfoView.as_view(), name="api-info"),
]
