from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone as dt_timezone

import stripe
from django.conf import settings
from django.utils import timezone as django_timezone

from accounts.models import User

logger = logging.getLogger(__name__)

# Ödəniş alınmış hesablanmış dövr — Stripe statusları
_PREMIUM_GRANT_STATUSES = frozenset(
    {"active", "trialing", "past_due"},
)
_PREMIUM_REVOKE_STATUSES = frozenset(
    {"canceled", "unpaid", "incomplete_expired", "paused"},
)


def _stripe_get(obj, key: str):
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(key)
    v = getattr(obj, key, None)
    if v is not None:
        return v
    if hasattr(obj, "get"):
        try:
            return obj.get(key)
        except Exception:
            return None
    return None


def _int_unix_ts(v) -> int | None:
    if v is None:
        return None
    try:
        i = int(v)
        return i if i > 0 else None
    except (TypeError, ValueError):
        return None


def _period_end_from_invoice(inv) -> int | None:
    if inv is None:
        return None
    ts = _int_unix_ts(_stripe_get(inv, "period_end"))
    if ts:
        return ts
    lines = _stripe_get(inv, "lines")
    data = getattr(lines, "data", None) if lines is not None else None
    if not data and isinstance(lines, dict):
        data = lines.get("data")
    if not data:
        return None
    for line in data:
        period = _stripe_get(line, "period")
        if period is None:
            continue
        end = _stripe_get(period, "end") if not isinstance(period, dict) else period.get("end")
        ts = _int_unix_ts(end)
        if ts:
            return ts
    return None


def _period_end_from_subscription_shallow(sub) -> int | None:
    ts = _int_unix_ts(_stripe_get(sub, "current_period_end"))
    if ts:
        return ts
    items = _stripe_get(sub, "items")
    data = getattr(items, "data", None) if items is not None else None
    if not data and isinstance(items, dict):
        data = items.get("data")
    if data:
        for item in data:
            ts = _int_unix_ts(_stripe_get(item, "current_period_end"))
            if ts:
                return ts
    inv = _stripe_get(sub, "latest_invoice")
    if isinstance(inv, str) and inv:
        try:
            inv = stripe.Invoice.retrieve(inv, expand=["lines.data"])
        except Exception:
            logger.exception("latest_invoice yüklənmədi")
            inv = None
    if inv is not None:
        ts = _period_end_from_invoice(inv)
        if ts:
            return ts
    return None


def _resolve_period_end_unix(subscription) -> int | None:
    """
    Stripe bəzən Checkout dönüşündə subscription.current_period_end göndərmir;
    invoice və ya subscription item səviyyəsində mövcud olur.
    """
    ts = _period_end_from_subscription_shallow(subscription)
    if ts:
        return ts

    sid = _stripe_get(subscription, "id")
    if not sid:
        return None

    try:
        invs = stripe.Invoice.list(subscription=str(sid), limit=8)
        for inv in invs.data:
            ts = _period_end_from_invoice(inv)
            if ts:
                logger.info(
                    "period_end invoice siyahısından götürüldü (sub=%s)",
                    sid,
                )
                return ts
    except Exception:
        logger.exception("Invoice.list fallback uğursuz (sub=%s)", sid)

    try:
        sub2 = stripe.Subscription.retrieve(
            str(sid),
            expand=["items.data.price", "latest_invoice.lines.data"],
        )
        ts = _period_end_from_subscription_shallow(sub2)
        if ts:
            logger.info(
                "period_end genişləndirilmiş Subscription.retrieve ilə tapıldı (sub=%s)",
                sid,
            )
            return ts
    except Exception:
        logger.exception("Subscription.retrieve (expand) uğursuz (sub=%s)", sid)

    return None


def _fallback_period_end_dt() -> datetime | None:
    days = getattr(settings, "STRIPE_PREMIUM_FALLBACK_DAYS", 0) or 0
    if days <= 0 and getattr(settings, "DEBUG", False):
        days = 32
    if days <= 0:
        return None
    logger.warning(
        "Stripe period sonu tapılmadı — fallback: bu gündən %s gün (DEBUG=%s, STRIPE_PREMIUM_FALLBACK_DAYS env)",
        days,
        getattr(settings, "DEBUG", False),
    )
    return django_timezone.now() + timedelta(days=days)


def _metadata_plan(meta) -> str | None:
    """Stripe metadata obyektindən plan: seeker | employer."""
    if meta is None:
        return None
    plan = None
    if isinstance(meta, dict):
        plan = meta.get("plan")
    else:
        plan = getattr(meta, "plan", None)
    plan = (plan or "").strip().lower()
    return plan if plan in ("seeker", "employer") else None


def _subscription_price_id(subscription) -> str | None:
    items = getattr(subscription, "items", None)
    if not items or not getattr(items, "data", None):
        return None
    first = items.data[0]
    price = getattr(first, "price", None)
    if price is None:
        return None
    if isinstance(price, str):
        return price
    pid = getattr(price, "id", None)
    return str(pid) if pid else None


def _customer_id(subscription) -> str | None:
    c = getattr(subscription, "customer", None)
    if c is None:
        return None
    if isinstance(c, str):
        return c
    return getattr(c, "id", None)


def _resolve_plan_kind(
    subscription,
    session_plan_hint: str | None,
) -> str | None:
    """
    Hansı premium növü: 'seeker' və ya 'employer'.
    Əvvəl qiymət ID (.env), sonra subscription metadata, sonra checkout hint.
    """
    price_id = (_subscription_price_id(subscription) or "").strip()
    seeker_price = (settings.STRIPE_PRICE_ID_SEEKER or "").strip()
    employer_price = (settings.STRIPE_PRICE_ID_EMPLOYER or "").strip()

    if price_id and seeker_price and price_id == seeker_price:
        return "seeker"
    if price_id and employer_price and price_id == employer_price:
        return "employer"

    sub_meta = getattr(subscription, "metadata", None)
    from_sub = _metadata_plan(sub_meta)
    if from_sub:
        logger.info(
            "Premium plan Stripe subscription metadata ilə təyin olundu: %s",
            from_sub,
        )
        return from_sub

    if session_plan_hint and session_plan_hint in ("seeker", "employer"):
        logger.info(
            "Premium plan Checkout sessiya hint ilə təyin olundu: %s (price_id=%s)",
            session_plan_hint,
            price_id or "—",
        )
        return session_plan_hint

    logger.warning(
        "Premium plan təyin olunmadı: price_id=%s env_seeker=%s env_employer=%s sub_meta=%s hint=%s",
        price_id or "—",
        bool(seeker_price),
        bool(employer_price),
        sub_meta,
        session_plan_hint,
    )
    return None


def sync_subscription_to_user(
    subscription,
    session_plan_hint: str | None = None,
) -> None:
    cid = _customer_id(subscription)
    if not cid:
        return
    user = User.objects.filter(stripe_customer_id=cid).first()
    if user is None:
        logger.warning(
            "stripe_customer_id=%s üçün istifadəçi tapılmadı",
            cid,
        )
        return

    kind = _resolve_plan_kind(subscription, session_plan_hint)
    status = (getattr(subscription, "status", "") or "").strip()

    if status in _PREMIUM_GRANT_STATUSES:
        if not kind:
            return
        ts = _resolve_period_end_unix(subscription)
        if ts is not None:
            dt = datetime.fromtimestamp(ts, tz=dt_timezone.utc)
        else:
            dt = _fallback_period_end_dt()
            if dt is None:
                logger.warning(
                    "Subscription %s üçün billing period sonu tapılmadı; premium yazılmır. "
                    "Test üçün .env: STRIPE_PREMIUM_FALLBACK_DAYS=32",
                    getattr(subscription, "id", "?"),
                )
                return
        updates: list[str] = []
        if kind == "seeker":
            user.premium_seeker_until = dt
            updates.append("premium_seeker_until")
        elif kind == "employer":
            user.premium_employer_until = dt
            updates.append("premium_employer_until")
        if updates:
            user.save(update_fields=updates)
        return

    if status in _PREMIUM_REVOKE_STATUSES:
        if not kind:
            return
        updates: list[str] = []
        if kind == "seeker":
            user.premium_seeker_until = None
            updates.append("premium_seeker_until")
        elif kind == "employer":
            user.premium_employer_until = None
            updates.append("premium_employer_until")
        if updates:
            user.save(update_fields=updates)


def attach_customer_and_sync_session(user: User, session) -> None:
    key = (settings.STRIPE_SECRET_KEY or "").strip()
    if key:
        stripe.api_key = key

    session_plan = _metadata_plan(getattr(session, "metadata", None))

    cid = getattr(session, "customer", None)
    if cid:
        user.stripe_customer_id = cid if isinstance(cid, str) else getattr(cid, "id", "")
        user.save(update_fields=["stripe_customer_id"])

    sub_raw = getattr(session, "subscription", None)
    sub_id = None
    if sub_raw:
        sub_id = sub_raw if isinstance(sub_raw, str) else getattr(sub_raw, "id", None)

    if sub_id:
        # Checkout-da expand olunan subscription bəzən items/prices natamam olur — tam yükləyirik.
        sub_full = stripe.Subscription.retrieve(
            str(sub_id),
            expand=["items.data.price", "latest_invoice.lines.data"],
        )
        sync_subscription_to_user(sub_full, session_plan_hint=session_plan)
        return

    cust = user.stripe_customer_id
    if not cust:
        return
    subs = stripe.Subscription.list(customer=cust, limit=8)
    for sub in subs.data:
        sync_subscription_to_user(sub, session_plan_hint=session_plan)
