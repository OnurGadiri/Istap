from django.contrib import admin

from .models import JobApplication, JobPosting, SavedJob


@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "employer",
        "location",
        "work_mode",
        "employment_type",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "work_mode", "employment_type")
    search_fields = ("title", "description", "company_display_name")
    raw_id_fields = ("employer",)


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    list_display = ("user", "job", "created_at")
    raw_id_fields = ("user", "job")


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ("job", "applicant", "status", "has_resume", "created_at")
    list_filter = ("status",)
    search_fields = ("job__title", "applicant__email", "cover_letter")
    raw_id_fields = ("job", "applicant")

    @admin.display(description="CV", boolean=True)
    def has_resume(self, obj: JobApplication) -> bool:
        return bool(obj.resume)
