from django.contrib import admin

from .models import JobSeekerProfile


@admin.register(JobSeekerProfile)
class JobSeekerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "location", "work_mode", "avatar", "updated_at")
    search_fields = ("user__email", "location", "skills")
    raw_id_fields = ("user",)
