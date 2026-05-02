from django.conf import settings
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Liveness probe for load balancers and the frontend status badge."""

    authentication_classes: list = []
    permission_classes: list = []

    def get(self, request: Request) -> Response:
        return Response({"status": "ok", "service": "istap-django"})


class InfoView(APIView):
    """Minimal service metadata for development clients."""

    authentication_classes: list = []
    permission_classes: list = []

    def get(self, request: Request) -> Response:
        return Response(
            {
                "name": "Istap API",
                "version": "0.1.0",
                "debug": settings.DEBUG,
            }
        )
