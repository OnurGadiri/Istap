import Link from "next/link";
import { HomeHeroCtas } from "@/components/HomeHeroCtas";
import { SiteHeader } from "@/components/SiteHeader";

function IconUser({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12h12" />
      <path d="M6 16h12" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function HeroJobPreview() {
  return (
    <div className="mx-auto w-full max-w-lg lg:max-w-none">
      <div className="glass-panel rounded-2xl p-6 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Nümunə elanlar
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-500">Texno şirkət</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              Full-stack developer
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="jb-chip">Bakı</span>
              <span className="jb-chip">Uzaqdan</span>
              <span className="jb-chip">Tam ştat</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4 opacity-95">
            <p className="text-xs font-medium text-slate-500">Marketinq agentliyi</p>
            <p className="mt-1 font-semibold text-slate-800">SMM mütəxəssisi</p>
            <span className="jb-chip mt-2">Hibrid</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-slate-200/80 bg-white px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                İşini tap, gələcəyini qur!
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
                Özünüzə uyğun vakansiyanı tapın, seçilmişlərdə saxlayın və bir neçə addımda
                müraciət edin. Şirkət və ya recruiter kimi isə elan yerləşdirin, namizəd
                axınını bir paneldən idarə edin.
              </p>
            </div>

            <div className="mt-10 glass-panel max-w-4xl rounded-2xl p-4 sm:p-6">
              <form action="/jobs" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Axtarış</span>
                  <input
                    name="q"
                    type="search"
                    placeholder="Vəzifə, açar sözlər"
                    className="jb-input w-full"
                  />
                </label>
                <label className="min-w-0 flex-1 sm:max-w-xs">
                  <span className="sr-only">Yer</span>
                  <input
                    name="location"
                    type="text"
                    placeholder="Şəhər, rayon"
                    className="jb-input w-full"
                  />
                </label>
                <button type="submit" className="jb-btn-primary shrink-0 sm:px-8">
                  Vakansiya tap
                </button>
              </form>
              <p className="mt-3 text-sm text-slate-500">
                Məsələn: developer, Bakı, uzaqdan — nəticələr səhifəsində əlavə filtr və
                sıralama var.
              </p>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
              <div>
                <HomeHeroCtas />
              </div>
              <HeroJobPreview />
            </div>
          </div>
        </section>

        <section
          className="bg-slate-50 px-4 py-14 sm:px-6 sm:py-18"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="features-heading"
              className="text-2xl font-bold text-slate-900 sm:text-3xl"
            >
              Nə təklif edirik?
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Axtarış, filtr və müraciət tarixçəsi — qarışıq proseslər yox, aydın addımlar.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <li className="glass-panel rounded-2xl p-7 transition hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <IconUser className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">Namizəd</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Profil, seçilmiş elanlar, bir neçə kliklə müraciət və müraciət
                  tarixçəsi.
                </p>
              </li>
              <li className="glass-panel rounded-2xl p-7 transition hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <IconBuilding className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">Şirkət</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Elan yerləşdirmə, redaktə, gələn CV-lərə baxış və status yeniləmə.
                </p>
              </li>
              <li className="glass-panel rounded-2xl p-7 transition hover:shadow-md sm:col-span-2 lg:col-span-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <IconSearch className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">Axtarış</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Mətn, yer, iş rejimi, məşğulluq növü, sıralama və səhifələmə.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-18">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              3 addım
            </h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              <li>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  1
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">Qeydiyyat</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Rol seçin: namizəd və ya şirkət / recruiter.
                </p>
              </li>
              <li>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  2
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">Profil və ya elan</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Məlumatları doldurun və ya vakansiya dərc edin.
                </p>
              </li>
              <li>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  3
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">Müraciət</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Bir kliklə göndərin, statusu paneldə izləyin.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="glass-panel flex flex-col items-start justify-between gap-6 rounded-2xl p-8 sm:flex-row sm:items-center sm:p-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Hazırsınız?
                </h2>
                <p className="mt-2 text-slate-600">
                  Elanlara keçin və ya işəgötürən kimi elan yerləşdirin.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/jobs" className="jb-btn-primary">
                  Vakansiyalar
                </Link>
                <Link href="/register" className="jb-btn-secondary">
                  Qeydiyyat
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Istap
          </p>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-600">
            <Link href="/jobs" className="hover:text-blue-700">
              Vakansiyalar
            </Link>
            <Link href="/login" className="hover:text-blue-700">
              Giriş
            </Link>
            <Link href="/register" className="hover:text-blue-700">
              Qeydiyyat
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
