from django.urls import path

from . import views

urlpatterns = [
    path("checkout/", views.CheckoutSessionView.as_view(), name="billing-checkout"),
    path("post-checkout/", views.PostCheckoutSyncView.as_view(), name="billing-post-checkout"),
    path("webhook/", views.stripe_webhook, name="billing-webhook"),
]
