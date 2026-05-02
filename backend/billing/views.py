from __future__ import annotations

import json
import logging

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User, UserRole
from accounts.serializers import UserSerializer

from .stripe_sync import attach_customer_and_sync_session, sync_subscription_to_user

logger = logging.getLogger(__name__)


class CheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan = (request.data.get("plan") or "").strip().lower()
        if plan not in ("seeker", "employer"):
            return Response(
                {"detail": "plan 'seeker' və ya 'employer' olmalıdır."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if plan == "seeker" and user.role != UserRole.JOB_SEEKER:
            return Response(
                {"detail": "Namizəd premium yalnız namizəd rolundakılar üçündür."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if plan == "employer" and user.role not in (
            UserRole.COMPANY,
            UserRole.RECRUITER,
        ):
            return Response(
                {"detail": "Şirkət premium yalnız şirkət və ya recruiter üçündür."},
                status=status.HTTP_403_FORBIDDEN,
            )

        secret = (settings.STRIPE_SECRET_KEY or "").strip()
        if not secret:
            return Response(
                {
                    "detail": (
                        "STRIPE_SECRET_KEY backend .env faylında boşdur. "
                        "Stripe Dashboard test açarını əlavə edin."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        price_id = (
            settings.STRIPE_PRICE_ID_SEEKER
            if plan == "seeker"
            else settings.STRIPE_PRICE_ID_EMPLOYER
        )
        price_id = (price_id or "").strip()
        if not price_id:
            which = "STRIPE_PRICE_ID_SEEKER" if plan == "seeker" else "STRIPE_PRICE_ID_EMPLOYER"
            return Response(
                {
                    "detail": (
                        f"{which} boşdur. Stripe-da recurring məhsul qiyməti yaradıb "
                        "price_... ID-ni .env-ə yazın."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        stripe.api_key = secret
        base = settings.FRONTEND_APP_URL
        try:
            session = stripe.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=f"{base}/premium?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{base}/premium?checkout=cancel",
                client_reference_id=str(user.id),
                metadata={
                    "user_id": str(user.id),
                    "plan": plan,
                },
                subscription_data={
                    "metadata": {
                        "user_id": str(user.id),
                        "plan": plan,
                    },
                },
                customer_email=user.email if not user.stripe_customer_id else None,
                customer=user.stripe_customer_id or None,
            )
        except stripe.StripeError as e:
            logger.exception("Stripe Checkout yaradılmadı")
            return Response(
                {"detail": getattr(e, "user_message", None) or str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        url = getattr(session, "url", None)
        if not url:
            return Response(
                {"detail": "Checkout URL alınmadı."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"checkout_url": url})


class PostCheckoutSyncView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = (request.data.get("session_id") or "").strip()
        if not session_id:
            return Response(
                {"detail": "session_id tələb olunur."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        secret = (settings.STRIPE_SECRET_KEY or "").strip()
        if not secret:
            return Response(
                {"detail": "Stripe konfiqurasiyası yoxdur."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        stripe.api_key = secret
        try:
            session = stripe.checkout.Session.retrieve(
                session_id,
                expand=["subscription"],
            )
        except stripe.StripeError as e:
            return Response(
                {"detail": getattr(e, "user_message", None) or str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        meta = getattr(session, "metadata", None)
        if isinstance(meta, dict):
            meta_uid = meta.get("user_id") or ""
        else:
            meta_uid = getattr(meta, "user_id", "") if meta is not None else ""
        if str(request.user.id) != str(meta_uid):
            return Response(
                {"detail": "Bu ödəniş sessiyası bu hesaba aid deyil."},
                status=status.HTTP_403_FORBIDDEN,
            )
        attach_customer_and_sync_session(request.user, session)
        request.user.refresh_from_db()
        return Response({"user": UserSerializer(request.user).data})


@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE") or ""
    wh_secret = (settings.STRIPE_WEBHOOK_SECRET or "").strip()
    stripe.api_key = (settings.STRIPE_SECRET_KEY or "").strip()

    if wh_secret:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, wh_secret)
        except ValueError:
            return HttpResponse(status=400)
        except stripe.SignatureVerificationError:
            return HttpResponse(status=400)
    elif settings.DEBUG:
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            return HttpResponse(status=400)
    else:
        return HttpResponse(status=503)

    etype = event["type"]
    data_object = event["data"]["object"]

    try:
        if etype == "checkout.session.completed":
            meta = data_object.get("metadata") or {}
            uid = meta.get("user_id")
            sess_id = data_object.get("id")
            if uid and sess_id:
                user = User.objects.filter(pk=int(uid)).first()
                if user:
                    session = stripe.checkout.Session.retrieve(
                        sess_id,
                        expand=["subscription"],
                    )
                    attach_customer_and_sync_session(user, session)
        elif etype in (
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ):
            sid = data_object.get("id")
            if sid:
                sub = stripe.Subscription.retrieve(sid)
                sync_subscription_to_user(sub)
    except Exception:
        logger.exception("Stripe webhook işlənərkən xəta")
        return HttpResponse(status=500)

    return HttpResponse(status=200)
